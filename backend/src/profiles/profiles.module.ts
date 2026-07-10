import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzleProfileRepository } from './infrastructure/drizzle-profile.repository';
import { PROFILE_REPOSITORY } from './domain/profile';
import { ProfileService } from './application/profile.service';
import { ProfileController } from './presentation/profile.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule],
  controllers: [ProfileController],
  providers: [
    DrizzleProfileRepository,
    ProfileService,
    alias(PROFILE_REPOSITORY, DrizzleProfileRepository),
  ],
})
export class ProfilesModule {}
