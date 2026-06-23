// Global request context (CLS) — assigns a requestId to every request and stores
// the HTTP method/path for log enrichment. Registered globally because
// controllers and filters both need it.
//
// Reads x-request-id from the incoming request header when present, otherwise
// generates a UUID. The stored values (requestId, method, path) are consumed by
// AllExceptionsFilter and can be injected anywhere via ClsService.
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: { headers?: Record<string, string | string[]> }) => {
          const headerId = req.headers?.['x-request-id'];
          if (typeof headerId === 'string' && headerId.length > 0) {
            return headerId;
          }
          if (Array.isArray(headerId) && headerId[0]) {
            return headerId[0];
          }
          return randomUUID();
        },
        setup: (
          cls,
          req: { method?: string; originalUrl?: string; url?: string },
        ) => {
          cls.set('requestId', cls.getId());
          cls.set('method', req.method ?? 'UNKNOWN');
          cls.set('path', req.originalUrl ?? req.url ?? 'UNKNOWN');
        },
      },
    }),
  ],
})
export class CoreRequestContextModule {}
