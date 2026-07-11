import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoNestLogger, PinoLogger } from 'nestjs-pino';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import { CoreConfigService } from './core/config/config.provider';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';
import { AUTH } from './iam/auth/better-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(PinoNestLogger));
  const config = app.get(CoreConfigService);

  app.enableCors({
    origin: [...config.server.corsOrigins],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // PinoLogger is a TRANSIENT-scoped provider; app.get() does not work for
  // scoped providers, so we resolve it explicitly. PinoLogger is a thin
  // wrapper that reads the per-request pino instance from AsyncLocalStorage
  // on every call, so sharing one instance across requests is safe and correct.
  const pinoLogger = await app.resolve(PinoLogger);
  app.useGlobalFilters(new AllExceptionsFilter(pinoLogger));

  const authHandler = toNodeHandler(app.get(AUTH));
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    void authHandler(req, res).catch(next);
  });

  // Socket.IO gateway support — without IoAdapter, @WebSocketGateway decorators
  // are inert (NestJS falls back to the bare `ws` package which doesn't speak
  // the Socket.IO protocol the client uses).
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(config.server.port);
  app
    .get(PinoNestLogger)
    .log(
      `Backend running on http://localhost:${config.server.port}`,
      'Bootstrap',
    );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
