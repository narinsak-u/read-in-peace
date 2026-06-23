// Provides the singleton Drizzle ORM client. Registered globally because
// every feature's infrastructure layer depends on it, and forcing every
// feature to import DatabaseModule would only add boilerplate.
import { Global, Module } from '@nestjs/common';
import { drizzleProvider, DATABASE } from './database.provider';

@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DATABASE],
})
export class CoreDatabaseModule {}
