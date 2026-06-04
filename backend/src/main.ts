import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth';
import { toNodeHandler } from 'better-auth/node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Mount Better Auth middleware — handles /api/auth/sign-in, /api/auth/sign-up,
  // /api/auth/sign-out, /api/auth/session and others
  const authHandler = toNodeHandler(auth);
  app.use('/api/auth', (req, res, next) => {
    authHandler(req, res).catch(next);
  });

  await app.listen(4000);
  console.log('Backend running on http://localhost:4000');
}
bootstrap();
