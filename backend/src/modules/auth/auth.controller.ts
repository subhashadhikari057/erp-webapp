import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  BadRequestException,
  Req,
  UseGuards,
  Get,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { JwtPayload } from './types/jwt-payload.type';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator'; // Adjust path if needed
import { format } from 'date-fns';

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
      const tokens = await this.authService.login(dto);

      const isProd = process.env.NODE_ENV === 'production';

      // Set refresh token in cookie (httpOnly, secure in prod)
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/auth/refresh',
      });

      // DEV ONLY: Set access token in cookie for easy local/Postman testing
      if (!isProd) {
        res.cookie('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000, // 15 minutes
          path: '/', // All routes
        });
      }

      // Log successful login
      const user = this.authService.decodeJwt(tokens.accessToken);
      await this.authService.logAuthEvent({
        userId: user.userId,
        companyId: user.companyId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        type: 'LOGIN',
        success: true,
      });

      // Return accessToken for frontend usage
      return { accessToken: tokens.accessToken };
    } catch (err) {
      // Log failed login attempt
      await this.authService.logAuthEvent({
        userId: undefined,
        companyId: undefined,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
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
  ): Promise<{ accessToken: string }> {
    const refreshToken = res.req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token missing');
    }

    const tokens = await this.authService.refreshToken({ refreshToken });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    // DEV ONLY: Also rotate access token cookie
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
  ): Promise<{ message: string }> {
    // Clear the cookies
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    res.clearCookie('accessToken', { path: '/' });

    // Log the logout event (if user is authenticated)
    const user = req.user as JwtPayload | undefined;
    const userId = user?.userId;
    const companyId = user?.companyId;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (userId) {
      await this.authService.logAuthEvent({
        userId,
        companyId,
        ip,
        userAgent,
        type: 'LOGOUT',
        success: true,
      });
    }

    return { message: 'Logged out successfully' };
  }

}
