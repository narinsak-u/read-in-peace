import { Test } from '@nestjs/testing';
import { DATABASE } from '../../../src/core/database/database.provider';
import { DrizzleChatRepository } from '../../../src/chat/infrastructure/drizzle-chat.repository';

describe('DrizzleChatRepository', () => {
  let repo: DrizzleChatRepository;
  let db: jest.Mocked<{
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
  }>;

  const mockMessage = {
    id: 'msg-1',
    senderId: 'u1',
    receiverId: 'u2',
    text: 'Hello!',
    read: false,
    createdAt: new Date('2026-07-11T10:00:00Z'),
  };

  beforeEach(async () => {
    db = {
      insert: jest.fn() as any,
      select: jest.fn() as any,
      update: jest.fn() as any,
    };

    const mod = await Test.createTestingModule({
      providers: [DrizzleChatRepository, { provide: DATABASE, useValue: db }],
    }).compile();

    repo = mod.get<DrizzleChatRepository>(DrizzleChatRepository);
  });

  describe('send', () => {
    it('inserts a message and returns it', async () => {
      const returningMock = jest.fn().mockResolvedValue([mockMessage]);
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: returningMock }),
      } as any);

      const result = await repo.send({
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count of unread messages', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: '5' }]),
        }),
      } as any);

      const count = await repo.getUnreadCount('u2');

      expect(count).toBe(5);
    });

    it('returns 0 when no unread messages', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: '0' }]),
        }),
      } as any);

      const count = await repo.getUnreadCount('u2');

      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('updates messages from a specific user to read', async () => {
      const setMock = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });
      (db.update as jest.Mock).mockReturnValue({ set: setMock } as any);

      await repo.markAsRead('u2', 'u1');

      expect(db.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({ read: true });
    });
  });
});
