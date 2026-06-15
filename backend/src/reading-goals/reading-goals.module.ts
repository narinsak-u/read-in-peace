import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ReadingGoalsController } from './reading-goals.controller';
import { ReadingGoalsService } from './reading-goals.service';

@Module({
  imports: [DbModule],
  controllers: [ReadingGoalsController],
  providers: [ReadingGoalsService],
})
export class ReadingGoalsModule {}
