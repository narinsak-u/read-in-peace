// Root module. Composes the platform (core/) and feature modules with
// explicit imports — no @Global abuse. Feature modules that depend on
// each other (transactions → books, social → iam) declare that
// dependency in their own imports, not here.
import { Module } from '@nestjs/common';
import { CoreConfigModule } from './core/config/config.module';
import { CoreDatabaseModule } from './core/database/database.module';
import { CoreLoggerModule } from './core/logger/logger.module';
import { CoreRequestContextModule } from './core/shared/request-context.module';
import { IamModule } from './iam/iam.module';
import { BooksModule } from './books/books.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SocialModule } from './social/social.module';
import { MembershipModule } from './membership/membership.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CoreConfigModule,
    CoreDatabaseModule,
    CoreLoggerModule,
    CoreRequestContextModule,
    IamModule,
    BooksModule,
    TransactionsModule,
    SocialModule,
    MembershipModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
