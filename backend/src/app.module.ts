// Root module that imports all feature modules (Auth, Db, Books, Transactions).
// Registers AppController (health check / root endpoint) and AppService.
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { BooksModule } from './books/books.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ReadingGoalsModule } from './reading-goals/reading-goals.module';

@Module({
  imports: [AuthModule, DbModule, BooksModule, TransactionsModule, ReadingGoalsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
