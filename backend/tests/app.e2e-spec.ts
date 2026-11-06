import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from '../src/app.module';
import { AUTH } from '../src/iam/auth/better-auth';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const authHandler = toNodeHandler(app.get(AUTH));
    app.use('/api/auth', (req, res, next) => {
      void authHandler(req, res).catch(next);
    });
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
  it.each([
    ['/api/auth/sign-in/email', { email: 'reader@example.test', password: 'local-password' }],
    ['/api/auth/sign-up/email', { name: 'Reader', email: 'reader@example.test', password: 'local-password' }],
    ['/api/auth/forget-password', { email: 'reader@example.test' }],
    ['/api/auth/sign-in/social', { provider: 'google', callbackURL: 'https://reading.localhost:8080' }],
    ['/api/auth/sign-in/social', { provider: 'github', callbackURL: 'https://reading.localhost:8080' }],
  ])('refuses retired local authentication at %s without creating a session', async (path, body) => {
    const response = await request(app.getHttpServer()).post(path).send(body);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(response.headers['set-cookie'] ?? [])).not.toContain('better-auth.session_token');
  });


  afterEach(async () => {
    await app.close();
  });
});
