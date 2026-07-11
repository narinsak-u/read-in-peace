import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../application/chat.service';
import { AUTH_PORT, type AuthPort } from '../../iam/auth/auth.port';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    @Inject(AUTH_PORT) private readonly authPort: AuthPort,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const session = await this.authPort.getSession(socket.handshake.headers);
      if (!session) {
        socket.disconnect();
        return;
      }
      (socket as any).userId = session.user.id;
      socket.join(`user:${session.user.id}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(): void {}

  @SubscribeMessage('chat:send')
  async handleSend(
    client: Socket,
    payload: { receiverId: string; text: string },
  ): Promise<void> {
    try {
      const senderId = (client as any).userId as string;
      const message = await this.chatService.send(
        senderId,
        payload.receiverId,
        payload.text,
      );
      this.server
        .to(`user:${payload.receiverId}`)
        .emit('chat:message', message);
      client.emit('chat:sent', {
        id: message.id,
        createdAt: message.createdAt,
      });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'SEND_FAILED',
        message: err?.message ?? 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('chat:conversations')
  async handleConversations(client: Socket): Promise<void> {
    try {
      const userId = (client as any).userId as string;
      const conversations = await this.chatService.getConversations(userId);
      const unreadCount = await this.chatService.getUnreadCount(userId);
      client.emit('chat:conversations', { conversations, unreadCount });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'CONVERSATIONS_FAILED',
        message: err?.message ?? 'Failed to load conversations',
      });
    }
  }

  @SubscribeMessage('chat:history')
  async handleHistory(
    client: Socket,
    payload: { userId: string; before?: string; limit?: number },
  ): Promise<void> {
    try {
      const currentUserId = (client as any).userId as string;
      const messages = await this.chatService.getHistory(
        currentUserId,
        payload.userId,
        payload.before,
        payload.limit,
      );
      client.emit('chat:history', { messages, userId: payload.userId });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'HISTORY_FAILED',
        message: err?.message ?? 'Failed to load history',
      });
    }
  }

  @SubscribeMessage('chat:read')
  async handleRead(client: Socket, payload: { userId: string }): Promise<void> {
    try {
      const currentUserId = (client as any).userId as string;
      await this.chatService.markAsRead(currentUserId, payload.userId);
      client.emit('chat:read', { userId: payload.userId });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'READ_FAILED',
        message: err?.message ?? 'Failed to mark as read',
      });
    }
  }

  @SubscribeMessage('chat:unread')
  async handleUnread(client: Socket): Promise<void> {
    try {
      const userId = (client as any).userId as string;
      const count = await this.chatService.getUnreadCount(userId);
      client.emit('chat:unread', { count });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'UNREAD_FAILED',
        message: err?.message ?? 'Failed to get unread count',
      });
    }
  }
}
