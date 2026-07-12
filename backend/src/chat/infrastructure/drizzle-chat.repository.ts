import { Injectable, Inject } from '@nestjs/common';
import { and, eq, or, desc, sql, count } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import {
  type ChatRepository,
  type DirectMessage,
  type Conversation,
  type SendMessageInput,
} from '../domain/chat';

@Injectable()
export class DrizzleChatRepository implements ChatRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async send(input: SendMessageInput): Promise<DirectMessage> {
    const [msg] = await this.db
      .insert(schema.directMessages)
      .values({
        senderId: input.senderId,
        receiverId: input.receiverId,
        text: input.text,
      })
      .returning();
    return this.toDirectMessage(msg);
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const result = await this.db.execute(sql`
      WITH ranked AS (
        SELECT
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END AS other_user_id,
          text AS last_message,
          created_at AS last_message_at,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN sender_id = ${userId} THEN receiver_id
                ELSE sender_id
              END
            ORDER BY created_at DESC
          ) AS rn
        FROM direct_messages
        WHERE ${userId} IN (sender_id, receiver_id)
      ),
      latest AS (
        SELECT other_user_id, last_message, last_message_at
        FROM ranked
        WHERE rn = 1
      ),
      unread_counts AS (
        SELECT
          sender_id AS other_user_id,
          COUNT(*)::int AS unread_count
        FROM direct_messages
        WHERE receiver_id = ${userId} AND read = false
        GROUP BY sender_id
      )
      SELECT
        l.other_user_id,
        l.last_message,
        l.last_message_at,
        COALESCE(uc.unread_count, 0) AS unread_count,
        u.name,
        u.image
      FROM latest l
      LEFT JOIN unread_counts uc ON uc.other_user_id = l.other_user_id
      JOIN "user" u ON u.id = l.other_user_id
      ORDER BY l.last_message_at DESC
    `);

    return (result.rows as any[]).map((r: any) => ({
      userId: r.other_user_id,
      name: r.name ?? 'Unknown',
      image: r.image ?? null,
      lastMessage: r.last_message,
      lastMessageAt: new Date(
        String(r.last_message_at).replace(' ', 'T') + 'Z',
      ).toISOString(),
      unreadCount: Number(r.unread_count),
    }));
  }

  async getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit = 50,
  ): Promise<DirectMessage[]> {
    const conditions = [
      or(
        and(
          eq(schema.directMessages.senderId, userId),
          eq(schema.directMessages.receiverId, otherUserId),
        ),
        and(
          eq(schema.directMessages.senderId, otherUserId),
          eq(schema.directMessages.receiverId, userId),
        ),
      ),
    ];

    if (before) {
      conditions.push(
        sql`${schema.directMessages.createdAt} < (SELECT created_at FROM direct_messages WHERE id = ${before})`,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.directMessages)
      .where(and(...conditions))
      .orderBy(desc(schema.directMessages.createdAt))
      .limit(limit);

    return rows.map((r) => this.toDirectMessage(r));
  }

  async markAsRead(receiverId: string, fromUserId: string): Promise<void> {
    await this.db
      .update(schema.directMessages)
      .set({ read: true })
      .where(
        and(
          eq(schema.directMessages.receiverId, receiverId),
          eq(schema.directMessages.senderId, fromUserId),
          eq(schema.directMessages.read, false),
        ),
      );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.directMessages)
      .where(
        and(
          eq(schema.directMessages.receiverId, userId),
          eq(schema.directMessages.read, false),
        ),
      );
    return Number(result?.count ?? 0);
  }

  private toDirectMessage(row: any): DirectMessage {
    return {
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      text: row.text,
      read: row.read,
      createdAt: row.createdAt,
    };
  }
}
