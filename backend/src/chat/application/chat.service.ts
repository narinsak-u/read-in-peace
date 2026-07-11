import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type ChatRepository,
  type DirectMessage,
  type Conversation,
} from '../domain/chat';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repo: ChatRepository,
  ) {}

  async send(
    senderId: string,
    receiverId: string,
    text: string,
  ): Promise<DirectMessage> {
    if (senderId === receiverId) {
      throw new ForbiddenException('Cannot send a message to yourself');
    }
    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }
    if (text.length > 2000) {
      throw new Error('Message too long');
    }
    return this.repo.send({ senderId, receiverId, text: text.trim() });
  }

  getConversations(userId: string): Promise<Conversation[]> {
    return this.repo.getConversations(userId);
  }

  getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit = 50,
  ): Promise<DirectMessage[]> {
    return this.repo.getHistory(userId, otherUserId, before, limit);
  }

  markAsRead(userId: string, fromUserId: string): Promise<void> {
    return this.repo.markAsRead(userId, fromUserId);
  }

  getUnreadCount(userId: string): Promise<number> {
    return this.repo.getUnreadCount(userId);
  }
}
