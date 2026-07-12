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
import type { AuthUser } from '../../iam/auth/auth.port';
import { ChatService } from '../application/chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: AuthUser) {
    return this.chatService.getConversations(user.id);
  }

  @Get('unread')
  getUnread(@CurrentUser() user: AuthUser) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Get('messages/:userId')
  getHistory(
    @CurrentUser() user: AuthUser,
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
    @CurrentUser() user: AuthUser,
    @Param('userId') fromUserId: string,
  ) {
    return this.chatService.markAsRead(user.id, fromUserId);
  }

  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() body: SendMessageDto) {
    return this.chatService.send(user.id, body.receiverId, body.text);
  }
}
