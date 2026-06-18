import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoNestLogger, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AUTH } from './auth/better-auth';
import { toNodeHandler } from 'better-auth/node';
import { ConfigService } from './config/config.provider';
import { AllExceptionsFilter } from './shared/errors/all-exceptions.filter';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoNestLogger));
  const config = app.get(ConfigService);

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

  app.useGlobalFilters(new AllExceptionsFilter(app.get(PinoLogger)));

  const authHandler = toNodeHandler(app.get(AUTH));
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    void authHandler(req, res).catch(next);
  });

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
