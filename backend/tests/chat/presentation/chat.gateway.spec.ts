import { Test } from '@nestjs/testing';
import { ChatGateway } from '../../../src/chat/presentation/chat.gateway';
import { ChatService } from '../../../src/chat/application/chat.service';
import { AUTH_PORT, type AuthPort } from '../../../src/iam/auth/auth.port';
import { ForbiddenException } from '@nestjs/common';
import type { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;
  let authPort: jest.Mocked<AuthPort>;

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      headers: { cookie: 'better-auth.session_token=valid-token' },
    },
    join: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as unknown as jest.Mocked<Socket>;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete (mockSocket as any).userId;

    chatService = {
      send: jest.fn(),
      getConversations: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    } as any;

    authPort = {
      getSession: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: chatService },
        { provide: AUTH_PORT, useValue: authPort },
      ],
    }).compile();

    gateway = mod.get<ChatGateway>(ChatGateway);
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  describe('handleConnection', () => {
    it('accepts valid session and joins user room', async () => {
      authPort.getSession.mockResolvedValue({
        user: {
          id: 'u1',
          name: 'User',
          email: 'u@t.com',
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: { id: 's1', userId: 'u1', expiresAt: new Date() },
      });

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('rejects invalid session', async () => {
      authPort.getSession.mockResolvedValue(null);

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('rejects on auth exception', async () => {
      authPort.getSession.mockRejectedValue(new Error('DB error'));

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleSend', () => {
    it('sends message and emits to receiver room', async () => {
      (mockSocket as any).userId = 'u1';
      chatService.send.mockResolvedValue({
        id: 'msg-1',
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
        read: false,
        createdAt: new Date(),
      });

      await gateway.handleSend(mockSocket as any, {
        receiverId: 'u2',
        text: 'Hello!',
      });

      expect(chatService.send).toHaveBeenCalledWith('u1', 'u2', 'Hello!');
      expect((gateway as any).server.to).toHaveBeenCalledWith('user:u2');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'chat:sent',
        expect.objectContaining({ id: 'msg-1' }),
      );
    });

    it('emits error on self-messaging', async () => {
      (mockSocket as any).userId = 'u1';
      chatService.send.mockRejectedValue(
        new ForbiddenException('Cannot send a message to yourself'),
      );

      await gateway.handleSend(mockSocket as any, {
        receiverId: 'u1',
        text: 'Hello!',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'chat:error',
        expect.objectContaining({ code: 'SEND_FAILED' }),
      );
    });
  });
});
