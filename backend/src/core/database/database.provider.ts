import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { CoreConfigService } from '../config/config.provider';

export const DATABASE = Symbol('DATABASE');

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseOrTransaction =
  | Database
  | Parameters<Parameters<Database['transaction']>[0]>[0];

export const drizzleProvider: Provider = {
  provide: DATABASE,
  inject: [CoreConfigService],
  useFactory: (config: CoreConfigService): Database => {
    const pool = new Pool({ connectionString: config.db.url });
    return drizzle(pool, { schema });
  },
};
