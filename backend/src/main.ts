import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
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

  const authHandler = toNodeHandler(auth);
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    void authHandler(req, res).catch(next);
  });

  await app.listen(4000);
  console.log('Backend running on http://localhost:4000');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
