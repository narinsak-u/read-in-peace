import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzleChatRepository } from './infrastructure/drizzle-chat.repository';
import { CHAT_REPOSITORY } from './domain/chat';
import { ChatService } from './application/chat.service';
import { ChatGateway } from './presentation/chat.gateway';
import { ChatController } from './presentation/chat.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule],
  controllers: [ChatController],
  providers: [
    DrizzleChatRepository,
    ChatService,
    ChatGateway,
    alias(CHAT_REPOSITORY, DrizzleChatRepository),
  ],
})
export class ChatModule {}
