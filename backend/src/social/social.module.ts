import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [DbModule],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
