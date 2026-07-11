import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from '../../../src/chat/application/chat.service';
import {
  CHAT_REPOSITORY,
  type ChatRepository,
  type DirectMessage,
  type Conversation,
} from '../../../src/chat/domain/chat';

describe('ChatService', () => {
  let svc: ChatService;
  let chatRepo: jest.Mocked<ChatRepository>;

  const mockMessage: DirectMessage = {
    id: 'msg-1',
    senderId: 'u1',
    receiverId: 'u2',
    text: 'Hello!',
    read: false,
    createdAt: new Date('2026-07-11T10:00:00Z'),
  };

  beforeEach(async () => {
    chatRepo = {
      send: jest.fn(),
      getConversations: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: CHAT_REPOSITORY, useValue: chatRepo },
      ],
    }).compile();

    svc = mod.get<ChatService>(ChatService);
  });

  describe('send', () => {
    it('throws ForbiddenException when sending to yourself', async () => {
      await expect(svc.send('u1', 'u1', 'Hello')).rejects.toThrow(
        ForbiddenException,
      );
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('throws Error when text is empty', async () => {
      await expect(svc.send('u1', 'u2', '')).rejects.toThrow(
        'Message cannot be empty',
      );
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('throws Error when text exceeds 2000 chars', async () => {
      await expect(svc.send('u1', 'u2', 'x'.repeat(2001))).rejects.toThrow(
        'Message too long',
      );
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('sends successfully', async () => {
      chatRepo.send.mockResolvedValue(mockMessage);

      const result = await svc.send('u1', 'u2', 'Hello!');

      expect(chatRepo.send).toHaveBeenCalledWith({
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getConversations', () => {
    it('returns conversations list', async () => {
      const conversations: Conversation[] = [
        {
          userId: 'u2',
          name: 'Jane',
          image: null,
          lastMessage: 'Hello!',
          lastMessageAt: new Date(),
          unreadCount: 2,
        },
      ];
      chatRepo.getConversations.mockResolvedValue(conversations);

      const result = await svc.getConversations('u1');

      expect(result).toEqual(conversations);
      expect(chatRepo.getConversations).toHaveBeenCalledWith('u1');
    });

    it('returns empty array when no conversations', async () => {
      chatRepo.getConversations.mockResolvedValue([]);

      const result = await svc.getConversations('u1');

      expect(result).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('returns message history', async () => {
      chatRepo.getHistory.mockResolvedValue([mockMessage]);

      const result = await svc.getHistory('u1', 'u2');

      expect(result).toEqual([mockMessage]);
      expect(chatRepo.getHistory).toHaveBeenCalledWith(
        'u1',
        'u2',
        undefined,
        50,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      chatRepo.getUnreadCount.mockResolvedValue(3);

      const result = await svc.getUnreadCount('u1');

      expect(result).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('calls repository markAsRead', async () => {
      chatRepo.markAsRead.mockResolvedValue(undefined);

      await svc.markAsRead('u1', 'u2');

      expect(chatRepo.markAsRead).toHaveBeenCalledWith('u1', 'u2');
    });
  });
});
