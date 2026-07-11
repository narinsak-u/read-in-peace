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
