import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { ChatService } from '../application/chat.service';

@Controller('api/chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: { id: string }) {
    return this.chatService.getConversations(user.id);
  }

  @Get('unread')
  getUnread(@CurrentUser() user: { id: string }) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Get('messages/:userId')
  getHistory(
    @CurrentUser() user: { id: string },
    @Param('userId') otherUserId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getHistory(
      user.id,
      otherUserId,
      before,
      limit ? Number(limit) : 50,
    );
  }

  @Post('messages/:userId/read')
  markAsRead(
    @CurrentUser() user: { id: string },
    @Param('userId') fromUserId: string,
  ) {
    return this.chatService.markAsRead(user.id, fromUserId);
  }

  @Post('messages')
  send(
    @CurrentUser() user: { id: string },
    @Body() body: { receiverId: string; text: string },
  ) {
    return this.chatService.send(user.id, body.receiverId, body.text);
  }
}
