import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MembershipService } from '../../../src/membership/application/membership.service';
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from '../../../src/membership/domain/membership.repository';
import { CoreConfigService } from '../../../src/core/config/config.provider';
import { STRIPE, type StripeClient } from '../../../src/transactions/infrastructure/stripe.provider';
import { DATABASE, type Database } from '../../../src/core/database/database.provider';
import { PurchaseConfirmationService } from '../../../src/transactions/application/purchase-confirmation.service';
import { PinoLogger } from 'nestjs-pino';

describe('MembershipService', () => {
  let service: MembershipService;
  let repo: jest.Mocked<MembershipRepository>;
  let config: { frontend: { url: string } };
  let stripe: any;
  let db: any;
  let purchases: any;

  beforeEach(async () => {
    repo = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
    };
    config = { frontend: { url: 'http://localhost:3000' } };
    stripe = {
      checkout: { sessions: { create: jest.fn() } },
      subscriptions: { update: jest.fn(), retrieve: jest.fn() },
    };
    db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([{ value: 3 }])),
        })),
      })),
    };
    purchases = { recordFromSession: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: MEMBERSHIP_REPOSITORY, useValue: repo },
        { provide: CoreConfigService, useValue: config },
        { provide: STRIPE, useValue: stripe },
        { provide: DATABASE, useValue: db },
        { provide: PurchaseConfirmationService, useValue: purchases },
        { provide: PinoLogger, useValue: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    service = mod.get<MembershipService>(MembershipService);
  });

  describe('getOrCreate', () => {
    it('returns existing membership', async () => {
      repo.findByUserId.mockResolvedValue({ id: '1', plan: 'curator', itemLimit: 25 } as any);
      const result = await service.getOrCreate('u1');
      expect(result.plan).toBe('curator');
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('creates free membership when missing', async () => {
      repo.findByUserId.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({ id: '2', plan: 'free', itemLimit: 15 } as any);
      await service.getOrCreate('u2');
      expect(repo.upsert).toHaveBeenCalledWith('u2', {
        plan: 'free',
        itemLimit: 15,
        status: 'active',
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('rejects free plan', async () => {
      await expect(service.createCheckoutSession('free', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects unknown plan', async () => {
      await expect(service.createCheckoutSession('unknown', 'u1')).rejects.toThrow(
        'Invalid plan',
      );
    });

    it('rejects when already on active plan', async () => {
      repo.findByUserId.mockResolvedValue({
        plan: 'curator',
        status: 'active',
        cancelAtPeriodEnd: false,
        itemLimit: 25,
      } as any);
      await expect(service.createCheckoutSession('curator', 'u1')).rejects.toThrow(
        'Already subscribed',
      );
    });

    it('creates session with correct params', async () => {
      repo.findByUserId.mockResolvedValue({ plan: 'free', status: 'active', cancelAtPeriodEnd: false, itemLimit: 15 } as any);
      stripe.checkout.sessions.create.mockResolvedValue({ url: 'https://stripe.com/c' });
      const result = await service.createCheckoutSession('curator', 'u1');
      expect(result.url).toBe('https://stripe.com/c');
      const call = stripe.checkout.sessions.create.mock.calls[0][0];
      expect(call.mode).toBe('subscription');
      expect(call.metadata).toEqual({ userId: 'u1', plan: 'curator' });
      expect(call.line_items[0].price_data.unit_amount).toBe(500);
    });

    it('throws on Stripe error', async () => {
      repo.findByUserId.mockResolvedValue({ plan: 'free', status: 'active', cancelAtPeriodEnd: false, itemLimit: 15 } as any);
      stripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe down'));
      await expect(service.createCheckoutSession('curator', 'u1')).rejects.toThrow(
        'Could not create checkout session',
      );
    });
  });

  describe('cancel', () => {
    it('upserts cancel state when no Stripe subscription locally', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: null } as any);
      const result = await service.cancel('u1');
      expect(result.effectiveDate).toBeDefined();
      expect(repo.upsert).toHaveBeenCalledWith('u1', expect.objectContaining({
        cancelAtPeriodEnd: true,
      }));
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('handles resource_missing gracefully', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: 'sub_123' } as any);
      const err: any = new Error('No such subscription: sub_123');
      err.code = 'resource_missing';
      stripe.subscriptions.update.mockRejectedValue(err);
      const result = await service.cancel('u1');
      expect(result.effectiveDate).toBeDefined();
      expect(repo.upsert).toHaveBeenCalledWith('u1', expect.objectContaining({
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: null,
        status: 'canceled',
      }));
    });

    it('persists cancelAtPeriodEnd on success', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: 'sub_1' } as any);
      stripe.subscriptions.update.mockResolvedValue({ current_period_end: 1700000000 });
      const result = await service.cancel('u1');
      expect(result.effectiveDate).toBe(new Date(1700000000 * 1000).toISOString());
      expect(repo.upsert).toHaveBeenCalledWith('u1', expect.objectContaining({
        cancelAtPeriodEnd: true,
      }));
    });
  });

  describe('reactivate', () => {
    it('upserts locally when cancelled but no Stripe subscription', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: null, cancelAtPeriodEnd: true } as any);
      await service.reactivate('u1');
      expect(repo.upsert).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: false });
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('rejects when not cancelled', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: false } as any);
      await expect(service.reactivate('u1')).rejects.toThrow('not scheduled for cancellation');
    });

    it('reactivates successfully', async () => {
      repo.findByUserId.mockResolvedValue({ stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true } as any);
      stripe.subscriptions.update.mockResolvedValue({});
      await service.reactivate('u1');
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        cancel_at_period_end: false,
      });
      expect(repo.upsert).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: false });
    });
  });

  describe('enforceBorrowLimit', () => {
    it('passes when below limit', async () => {
      repo.findByUserId.mockResolvedValue({ itemLimit: 15, plan: 'free' } as any);
      db.select.mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ value: 5 }]) }),
      });
      await expect(service.enforceBorrowLimit('u1')).resolves.toBeUndefined();
    });

    it('throws when at limit', async () => {
      repo.findByUserId.mockResolvedValue({ itemLimit: 15, plan: 'free' } as any);
      db.select.mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ value: 15 }]) }),
      });
      await expect(service.enforceBorrowLimit('u1')).rejects.toThrow(/borrow limit/);
    });
  });
});
