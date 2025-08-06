import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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
  async login(dto: LoginDto, ip: string, userAgent: string): Promise<TokenDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User with this email does not exist');
    }
    if (!user.isActive) {
      await this.logAuthEvent({
        userId: user.id,
        companyId: user.companyId,
        ip,
        userAgent,
        type: 'FAIL',
        success: false,
      });
      throw new UnauthorizedException('User account is inactive');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.logAuthEvent({
        userId: user.id,
        companyId: user.companyId,
        ip,
        userAgent,
        type: 'FAIL',
        success: false,
      });
      throw new UnauthorizedException('Incorrect password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Permissions extraction from RolePermissions
    const permissions = user.userRoles.flatMap(ur => 
      ur.role.rolePermissions.map(rp => rp.permission.name)
    );

    const roleIds = user.userRoles.map(ur => ur.roleId);
    const isSuperadmin = roleIds.includes('superadmin');

    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.companyId,
      roleIds,
      permissions,
      tokenVersion: user.tokenVersion,
      isSuperadmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    // Create session after successful authentication
    await this.createSession({
      userId: user.id,
      companyId: user.companyId,
      ip,
      userAgent,
      refreshToken,
    });

    // Log successful login
    await this.logAuthEvent({
      userId: user.id,
      companyId: user.companyId,
      ip,
      userAgent,
      type: 'LOGIN',
      success: true,
    });

    return { accessToken, refreshToken };
  }

  // Refresh token logic
  async refreshToken(dto: RefreshTokenDto, ip: string, userAgent: string): Promise<TokenDto> {
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
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Permissions extraction from RolePermissions
      const permissions = user.userRoles.flatMap(ur => 
        ur.role.rolePermissions.map(rp => rp.permission.name)
      );

      const roleIds = user.userRoles.map(ur => ur.roleId);
      const isSuperadmin = roleIds.includes('superadmin');

      const newPayload: JwtPayload = {
        userId: user.id,
        companyId: user.companyId,
        roleIds,
        permissions,
        tokenVersion: user.tokenVersion,
        isSuperadmin,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.signAccessToken(newPayload),
        this.signRefreshToken(newPayload),
      ]);

      // Update session lastSeenAt and token hash for the refresh
      await this.updateSession({
        userId: user.id,
        oldTokenHash: this.hashToken(dto.refreshToken),
        newTokenHash: this.hashToken(refreshToken),
        ip,
        userAgent,
      });

      return { accessToken, refreshToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // Sign tokens
  private async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRY') || '15m',
    });
  }

  private async signRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: this.config.get<string>('JWT_REFRESH_TOKEN_EXPIRY') || '7d',
    });
  }

  // Decode token helper
  decodeJwt(token: string): JwtPayload {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(Buffer.from(payload, 'base64').toString()) as JwtPayload;
    } catch {
      return {} as JwtPayload;
    }
  }

  // Hash token for secure storage
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Create session during login
  private async createSession({
    userId,
    companyId,
    ip,
    userAgent,
    refreshToken,
  }: {
    userId: string;
    companyId: string;
    ip: string;
    userAgent: string;
    refreshToken: string;
  }) {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      await this.prisma.session.create({
        data: {
          userId,
          companyId,
          ip: ip || '',
          userAgent: userAgent || '',
          tokenHash,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
    } catch (error) {
      // Don't throw on session creation failure, just log it
      console.error('Failed to create session:', error);
    }
  }

  // Update session during token refresh
  private async updateSession({
    userId,
    oldTokenHash,
    newTokenHash,
    ip,
    userAgent,
  }: {
    userId: string;
    oldTokenHash: string;
    newTokenHash: string;
    ip: string;
    userAgent: string;
  }) {
    try {
      await this.prisma.session.updateMany({
        where: {
          userId,
          tokenHash: oldTokenHash,
          isActive: true,
        },
        data: {
          tokenHash: newTokenHash,
          lastSeenAt: new Date(),
          ip: ip || '',
          userAgent: userAgent || '',
        },
      });
    } catch (error) {
      // Don't throw on session update failure, just log it
      console.error('Failed to update session:', error);
    }
  }

  // Logout and revoke session
  async logout(refreshToken: string, ip: string, userAgent: string): Promise<{ message: string }> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      // Mark session as inactive
      await this.prisma.session.updateMany({
        where: {
          tokenHash,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // Try to get user info for logging (don't fail if we can't)
      try {
        const payload = this.decodeJwt(refreshToken);
        if (payload.userId) {
          await this.logAuthEvent({
            userId: payload.userId,
            companyId: payload.companyId,
            ip,
            userAgent,
            type: 'LOGOUT',
            success: true,
          });
        }
      } catch {
        // Silent fail on logging
      }

      return { message: 'Logged out successfully' };
    } catch (error) {
      // Even if session revocation fails, return success to avoid info leakage
      return { message: 'Logged out successfully' };
    }
  }

  // Log audit events (authentication + other operations)
  async logAuditEvent({
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
    type: 'LOGIN' | 'LOGOUT' | 'FAIL' | 'PROFILE_UPDATE' | 'PASSWORD_CHANGE' | 
          'COMPANY_CREATE' | 'COMPANY_UPDATE' | 'COMPANY_DELETE' | 'COMPANY_MODULE_UPDATE';
    success: boolean;
  }) {
    try {
      await this.prisma.authLog.create({
        data: {
          userId: userId || '-',
          companyId: companyId || '-',
          ip: ip || '',
          userAgent: userAgent || '',
          type,
          success,
        },
      });
    } catch {
      // Don't throw on logging failure
    }
  }

  // Legacy method for backward compatibility
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
    return this.logAuditEvent({ userId, companyId, ip, userAgent, type, success });
  }
}
