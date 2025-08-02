import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';

import { LoginDto } from './dto/login.dto';
import { TokenDto } from './dto/token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Handles user login
  async login(dto: LoginDto): Promise<TokenDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      // Log failed login
      throw new UnauthorizedException('User with this email does not exist');
    }
    if (!user.isActive) {
      // Log failed login
      await this.logAuthEvent({
        userId: user.id,
        companyId: user.companyId,
        ip: '', // set in controller if desired
        userAgent: '',
        type: 'FAIL',
        success: false,
      });
      throw new UnauthorizedException('User account is inactive');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      // Log failed login
      await this.logAuthEvent({
        userId: user.id,
        companyId: user.companyId,
        ip: '', // set in controller if desired
        userAgent: '',
        type: 'FAIL',
        success: false,
      });
      throw new UnauthorizedException('Incorrect password');
    }

    // ✅ Update lastLoginAt on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Combine all permissions from user roles
    const permissions = user.userRoles.flatMap(ur => ur.role.permissions);

    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.companyId,
      roleIds: user.userRoles.map(ur => ur.roleId),
      permissions,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  // Refreshes a user's access token
  async refreshToken(dto: RefreshTokenDto): Promise<TokenDto> {
    try {
      const publicKeyPath = this.config.get<string>('JWT_PUBLIC_KEY_PATH');
      if (!publicKeyPath) {
        throw new Error('JWT_PUBLIC_KEY_PATH is not configured');
      }
      const publicKey = readFileSync(join(process.cwd(), publicKeyPath), 'utf8');
      
      const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        publicKey,
        algorithms: ['RS256'],
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const permissions = user.userRoles.flatMap(ur => ur.role.permissions);

      const newPayload: JwtPayload = {
        userId: user.id,
        companyId: user.companyId,
        roleIds: user.userRoles.map(ur => ur.roleId),
        permissions,
        tokenVersion: user.tokenVersion,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.signAccessToken(newPayload),
        this.signRefreshToken(newPayload),
      ]);

      return { accessToken, refreshToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }


  // Sign access token
  private async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRY') || '15m',
    });
  }

  // Sign refresh token
  private async signRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: this.config.get<string>('JWT_REFRESH_TOKEN_EXPIRY') || '7d',
    });
  }

  // Helper: decode a JWT (access token) without verifying signature
  decodeJwt(token: string): JwtPayload {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(Buffer.from(payload, 'base64').toString()) as JwtPayload;
    } catch {
      return {} as JwtPayload;
    }
  }

  // Log login/logout/fail events
  async logAuthEvent({
    userId,
    companyId,
    ip,
    userAgent,
    type,
    success,
  }: {
    userId?: string;
    companyId?: string;
    ip?: string;
    userAgent?: string;
    type: 'LOGIN' | 'LOGOUT' | 'FAIL';
    success: boolean;
  }) {
    try {
      await this.prisma.authLog.create({
        data: {
          userId: userId || '-',             // If userId is required as string, handle similarly
          companyId: companyId || '-',
          ip: ip || '',
          userAgent: userAgent || '',
          type,
          success,
        },
      });
    } catch (err) {
      // Optional: log this error to a monitoring service
      // Don't throw — we don't want to break login/logout if logging fails
    }
  }
}
