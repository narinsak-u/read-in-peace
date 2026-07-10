import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProfileService } from '../../../src/profiles/application/profile.service';
import {
  PROFILE_REPOSITORY,
  type ProfileRepository,
} from '../../../src/profiles/domain/profile';

describe('ProfileService', () => {
  let svc: ProfileService;
  let profiles: jest.Mocked<ProfileRepository>;

  beforeEach(async () => {
    profiles = {
      findById: jest.fn(),
      getCategoryStats: jest.fn(),
      isFollowing: jest.fn(),
      countFollowers: jest.fn(),
      toggleFollow: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PROFILE_REPOSITORY, useValue: profiles },
      ],
    }).compile();

    svc = mod.get<ProfileService>(ProfileService);
  });

  describe('toggleFollow', () => {
    it('throws ForbiddenException when following yourself', async () => {
      await expect(svc.toggleFollow('u1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      profiles.findById.mockResolvedValue(null);
      await expect(svc.toggleFollow('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('delegates to repository and returns following state + count', async () => {
      profiles.findById.mockResolvedValue({
        id: 'u2',
        name: 'Jane',
        image: null,
        createdAt: new Date(),
      });
      profiles.toggleFollow.mockResolvedValue({
        following: true,
        followerCount: 3,
      });

      const result = await svc.toggleFollow('u1', 'u2');

      expect(profiles.toggleFollow).toHaveBeenCalledWith('u1', 'u2');
      expect(result).toEqual({ following: true, followerCount: 3 });
    });

    it('returns false following when unfollowing', async () => {
      profiles.findById.mockResolvedValue({
        id: 'u2',
        name: 'Jane',
        image: null,
        createdAt: new Date(),
      });
      profiles.toggleFollow.mockResolvedValue({
        following: false,
        followerCount: 1,
      });

      const result = await svc.toggleFollow('u1', 'u2');

      expect(result.following).toBe(false);
      expect(result.followerCount).toBe(1);
    });
  });

  describe('getProfile', () => {
    it('throws NotFoundException when user not found', async () => {
      profiles.findById.mockResolvedValue(null);
      await expect(svc.getProfile('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns profile with follow info when current user is provided', async () => {
      profiles.findById.mockResolvedValue({
        id: 'u2',
        name: 'Jane',
        image: null,
        createdAt: new Date(),
      });
      profiles.getCategoryStats.mockResolvedValue([]);
      profiles.isFollowing.mockResolvedValue(true);
      profiles.countFollowers.mockResolvedValue(5);

      const result = await svc.getProfile('u2', 'u1');

      expect(result.follow).toEqual({ following: true, followerCount: 5 });
      expect(profiles.isFollowing).toHaveBeenCalledWith('u1', 'u2');
    });

    it('returns null follow info when no current user', async () => {
      profiles.findById.mockResolvedValue({
        id: 'u2',
        name: 'Jane',
        image: null,
        createdAt: new Date(),
      });
      profiles.getCategoryStats.mockResolvedValue([]);

      const result = await svc.getProfile('u2');

      expect(result.follow).toBeNull();
      expect(profiles.isFollowing).not.toHaveBeenCalled();
    });
  });
});
