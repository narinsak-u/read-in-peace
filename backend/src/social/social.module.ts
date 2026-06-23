// Social feature module — reader feed (posts, likes, replies).
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzlePostRepository } from './infrastructure/drizzle-post.repository';
import { POST_REPOSITORY, type PostRepository } from './domain/post';
import { SocialService } from './application/social.service';
import { SocialController } from './presentation/social.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule],
  controllers: [SocialController],
  providers: [
    DrizzlePostRepository,
    SocialService,
    alias(POST_REPOSITORY, DrizzlePostRepository),
  ],
  exports: [SocialService, POST_REPOSITORY],
})
export class SocialModule {}

export type { PostRepository };
