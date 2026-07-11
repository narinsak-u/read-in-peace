export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  userId: string;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export type SendMessageInput = {
  senderId: string;
  receiverId: string;
  text: string;
};

export interface ChatRepository {
  send(input: SendMessageInput): Promise<DirectMessage>;
  getConversations(userId: string): Promise<Conversation[]>;
  getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit?: number,
  ): Promise<DirectMessage[]>;
  markAsRead(receiverId: string, fromUserId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}
