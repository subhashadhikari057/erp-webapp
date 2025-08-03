import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { JwtPayload } from './types/jwt-payload.type';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<{ accessToken: string }> {
    try {
      const ip = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const tokens = await this.authService.login(dto, ip, userAgent);

      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/auth',
      });

      if (!isProd) {
        res.cookie('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
          path: '/',
        });
      }

      const user = this.authService.decodeJwt(tokens.accessToken);
      await this.authService.logAuthEvent({
        userId: user.userId,
        companyId: user.companyId,
        ip,
        userAgent,
        type: 'LOGIN',
        success: true,
      });

      return { accessToken: tokens.accessToken };
    } catch (err) {
      const ip = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      await this.authService.logAuthEvent({
        userId: undefined,
        companyId: undefined,
        ip,
        userAgent,
        type: 'FAIL',
        success: false,
      });

      throw err;
    }
  }

  // POST /auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token missing');
    }

    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const tokens = await this.authService.refreshToken({ refreshToken }, ip, userAgent);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });

    if (!isProd) {
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });
    }

    return { accessToken: tokens.accessToken };
  }

  // POST /auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Body() body?: { refreshToken?: string },
  ): Promise<{ message: string }> {
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // Get refresh token BEFORE clearing cookies (from body or cookies)
    const refreshToken = body?.refreshToken || req.cookies?.refreshToken;
    
    // Clear cookies after reading the refresh token
    res.clearCookie('refreshToken', { path: '/auth' });
    res.clearCookie('accessToken', { path: '/' });

    if (refreshToken) {
      // Use the auth service logout method to revoke session
      return this.authService.logout(refreshToken, ip, userAgent);
    }

    return { message: 'Logged out successfully' };
  }
}
