jest.mock('../../../src/iam/identity-recovery/identity-recovery.service', () => ({
  IdentityRecoveryService: class IdentityRecoveryService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CoreConfigService } from '../../../src/core/config/config.provider';
import { IdentityRecoveryController } from '../../../src/iam/identity-recovery/identity-recovery.controller';
import { IdentityRecoveryService } from '../../../src/iam/identity-recovery/identity-recovery.service';

const config = {
  auth: { baseUrl: 'https://reading.example.test' },
  frontend: { url: 'https://reading.example.test' },
  server: { nodeEnv: 'test' },
};

describe('identity recovery HTTP behavior', () => {
  async function createApp(recovery: object) {
    const module = await Test.createTestingModule({
      controllers: [IdentityRecoveryController],
      providers: [
        { provide: CoreConfigService, useValue: config },
        { provide: IdentityRecoveryService, useValue: recovery },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    return app;
  }

  it('rejects an unproven local credential without issuing a session', async () => {
    const app = await createApp({
      begin: jest.fn().mockRejectedValue(new UnauthorizedException('Recovery proof failed.')),
    });

    const response = await request(app.getHttpServer())
      .post('/api/identity-recovery/start')
      .send({ email: 'reader@example.test', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
    await app.close();
  });

  it('starts recovery without creating an Application Session', async () => {
    const app = await createApp({
      begin: jest.fn().mockResolvedValue({ state: 'opaque-state', authorizationUrl: 'https://identity.example.test/authorize' }),
    });

    const response = await request(app.getHttpServer())
      .post('/api/identity-recovery/start')
      .send({ email: 'reader@example.test', password: 'existing-password' });

    expect(response.status).toBe(200);
    expect(response.body.authorizationUrl).toBe('https://identity.example.test/authorize');
    expect(response.headers['set-cookie'][0]).toContain('reading_identity_recovery=opaque-state');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).not.toContain('better-auth.session_token');
    await app.close();
  });

  it('fails closed when the OIDC callback reports a conflicting identity', async () => {
    const app = await createApp({
      complete: jest.fn().mockRejectedValue(new UnauthorizedException('Conflicting identity link.')),
    });

    const response = await request(app.getHttpServer())
      .get('/api/identity-recovery/callback?state=opaque-state')
      .set('Cookie', 'reading_identity_recovery=opaque-state');

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe('https://reading.example.test/account/identity?error=recovery');
    expect(response.headers['set-cookie'][0]).toContain('reading_identity_recovery=;');
    await app.close();
  });
});
