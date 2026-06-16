import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ReadingGoalsService } from './reading-goals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/user/reading-goal')
@UseGuards(AuthGuard)
export class ReadingGoalsController {
  constructor(private readonly readingGoalsService: ReadingGoalsService) {}

  @Get()
  getGoal(@CurrentUser() user: { id: string }) {
    return this.readingGoalsService.getGoal(user.id);
  }

  @Put()
  setGoal(@Body('goal') goal: number, @CurrentUser() user: { id: string }) {
    return this.readingGoalsService.setGoal(user.id, goal);
  }
}
