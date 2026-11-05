import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CoreConfigService } from '../../core/config/config.provider';
import { IdentityRecoveryService } from './identity-recovery.service';

const COOKIE = 'reading_identity_recovery';

@Controller('api/identity-recovery')
export class IdentityRecoveryController {
  constructor(
    private readonly recovery: IdentityRecoveryService,
    private readonly config: CoreConfigService,
  ) {}

  @Post('start')
  @HttpCode(200)
  async start(
    @Body() body: { email?: string; password?: string },
    @Res() response: Response,
  ) {
    if (!body.email || !body.password) throw new UnauthorizedException('Recovery proof failed.');
    const result = await this.recovery.begin(body.email, body.password);
    this.setStateCookie(response, result.state);
    return response.json({ authorizationUrl: result.authorizationUrl });
  }

  @Post('provider')
  @HttpCode(200)
  async beginProvider(
    @Body() body: { provider?: string },
    @Res() response: Response,
  ) {
    if (body.provider !== 'google' && body.provider !== 'github') {
      throw new UnauthorizedException('Recovery proof failed.');
    }
    const result = await this.recovery.beginProvider(body.provider);
    this.setStateCookie(response, result.state);
    return response.json({ authorizationUrl: result.authorizationUrl });
  }

  @Get('provider/callback')
  async providerCallback(@Req() request: Request, @Res() response: Response) {
    try {
      const result = await this.recovery.completeProvider(
        new URL(request.originalUrl, this.config.auth.baseUrl),
        this.readStateCookie(request),
      );
      this.setStateCookie(response, result.state);
      return response.redirect(303, result.authorizationUrl);
    } catch {
      this.clearStateCookie(response);
      return response.redirect(303, `${this.config.frontend.url}/account/identity?error=recovery`);
    }
  }

  @Get('callback')
  async callback(@Req() request: Request, @Res() response: Response) {
    try {
      await this.recovery.complete(
        new URL(request.originalUrl, this.config.auth.baseUrl),
        this.readStateCookie(request),
      );
      this.clearStateCookie(response);
      return response.redirect(303, `${this.config.frontend.url}/account/identity?recovered=1`);
    } catch {
      this.clearStateCookie(response);
      return response.redirect(303, `${this.config.frontend.url}/account/identity?error=recovery`);
    }
  }

  private setStateCookie(response: Response, state: string): void {
    response.cookie(COOKIE, state, {
      httpOnly: true,
      secure: this.config.server.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/api/identity-recovery',
      maxAge: 5 * 60 * 1000,
    });
  }

  private clearStateCookie(response: Response): void {
    response.clearCookie(COOKIE, {
      httpOnly: true,
      secure: this.config.server.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/api/identity-recovery',
    });
  }

  private readStateCookie(request: Request): string {
    const cookieHeader = request.headers.cookie ?? '';
    const value = cookieHeader.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!value) throw new UnauthorizedException('Recovery proof failed.');
    return decodeURIComponent(value);
  }
}
