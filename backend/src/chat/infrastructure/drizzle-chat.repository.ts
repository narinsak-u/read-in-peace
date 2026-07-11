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
    const rows = await this.db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END
        )
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END AS other_user_id,
          text AS last_message,
          created_at AS last_message_at,
          COUNT(*) FILTER (WHERE receiver_id = ${userId} AND read = false) OVER (
            PARTITION BY
              CASE
                WHEN sender_id = ${userId} THEN receiver_id
                ELSE sender_id
              END
          ) AS unread_count
        FROM direct_messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
        ORDER BY
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END,
          created_at DESC
      )
      SELECT l.*, u.name, u.image
      FROM latest l
      JOIN "user" u ON u.id = l.other_user_id
      ORDER BY l.last_message_at DESC
    `);

    return (rows.rows as any[]).map((r: any) => ({
      userId: r.other_user_id,
      name: r.name ?? 'Unknown',
      image: r.image ?? null,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
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
