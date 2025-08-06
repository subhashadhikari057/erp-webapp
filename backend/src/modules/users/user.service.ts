import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  /**
   * Get minimal info for the user by their ID, including roles.
   * Used for /users/me endpoint.
   */
  async getBasicUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyId: true,
        isActive: true,
        lastLoginAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Flatten roles for easy response
    const roles = user?.userRoles?.map(ur => ur.role) ?? [];

    // Return everything except userRoles, add roles
    if (!user) return null;
    const { userRoles, ...rest } = user;
    return {
      ...rest,
      roles,
    };
  }



  /**
   * Get user profile with tenant validation
   * Ensures user can only access their own profile within their company
   */
  async getUserProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { 
        id: userId,
        companyId: tenantId  // Enforce tenant isolation
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyId: true,
        isActive: true,
        isCompanyAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found or access denied');
    }

    // Flatten roles for easy response
    const roles = user?.userRoles?.map(ur => ur.role) ?? [];
    const { userRoles, ...rest } = user;

    return {
      ...rest,
      roles,
    };
  }

  /**
   * Get all users within the same company (tenant isolation)
   */
  async getCompanyUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { 
        companyId: tenantId,
        isActive: true,
        deletedAt: null  // Only active, non-deleted users
      },
      select: {
        id: true,
        email: true,
        name: true,
        isCompanyAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isCompanyAdmin: 'desc' },  // Company admins first
        { name: 'asc' },            // Then by name
      ],
    });

    // Transform the response to flatten roles
    return users.map(user => {
      const roles = user.userRoles?.map(ur => ur.role) ?? [];
      const { userRoles, ...rest } = user;
      return {
        ...rest,
        roles,
      };
    });
  }

  /**
   * Update the profile for the current user with tenant validation.
   * Throws if user not found or email is already taken by another user.
   */
  async updateProfile(userId: string, tenantId: string, dto: UpdateProfileDto) {
    // First verify user belongs to the tenant
    const existingUser = await this.prisma.user.findUnique({
      where: { 
        id: userId,
        companyId: tenantId  // Enforce tenant isolation
      },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found or access denied');
    }
    // If email is being updated, ensure uniqueness
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email is already in use.');
      }
    }

    // Only update fields that are provided (PATCH semantics)
    const updatedUser = await this.prisma.user.update({
      where: { 
        id: userId,
        companyId: tenantId  // Enforce tenant isolation on update too
      },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyId: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    // Audit log for profile update
    await this.authService.logAuditEvent({
      userId,
      companyId: tenantId,
      type: 'PROFILE_UPDATE',
      success: true,
    });

    return updatedUser;
  }



  /**
   * Change the password for the current user.
   * Throws if current password does not match.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found.');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new ForbiddenException('Current password is incorrect.');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password cannot be same as current password.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newPasswordHash,
        forcePasswordChange: false,   // Optional: clear force flag if used
        tokenVersion: user.tokenVersion + 1, // Invalidate existing refresh tokens
      },
    });

    // Audit log for password change
    await this.authService.logAuditEvent({
      userId,
      companyId: user.companyId,
      type: 'PASSWORD_CHANGE',
      success: true,
    });

    return { message: 'Password changed successfully.' };
  }

  /**
   * Get the current user's own audit logs (login/logout/fail).
   * Returns the most recent 20 events, newest first.
   */
  async getOwnAuditLogs(userId: string, page = 1, pageSize = 5) {
    const skip = (page - 1) * pageSize;
  
    // Get total count for pagination metadata
    const [logs, total] = await Promise.all([
      this.prisma.authLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          type: true,
          success: true,
          ip: true,
          userAgent: true,
          timestamp: true,
        },
      }),
      this.prisma.authLog.count({ where: { userId } }),
    ]);
  
    return {
      data: logs,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  

  /**
   * Get all active sessions for the current user.
   * Returns the most recent 10 sessions (customize as needed).
   */
  async getMyActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastSeenAt: 'desc',
      },
      take: 10, // adjust or paginate as needed
      select: {
        id: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        lastSeenAt: true,
        isActive: true,
        revokedAt: true,
      },
    });
  }

  /**
   * Logout from all active sessions (revoke all sessions for the user).
   * This will mark all active sessions as inactive.
   */
  async logoutFromAllSessions(userId: string) {
    try {
      const updateResult = await this.prisma.session.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Logged out from ${updateResult.count} active sessions`,
        sessionsRevoked: updateResult.count,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to logout from all sessions',
        sessionsRevoked: 0,
      };
    }
  }

  /**
   * Terminate a specific session by ID.
   * Only allows terminating sessions that belong to the current user.
   */
  async terminateSession(userId: string, sessionId: string) {
    try {
      // First, check if the session exists and belongs to the user
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found or does not belong to you',
        };
      }

      if (!session.isActive) {
        return {
          success: false,
          message: 'Session is already inactive',
        };
      }

      // Terminate the session
      await this.prisma.session.update({
        where: {
          id: sessionId,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Session terminated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to terminate session',
      };
    }
  }
}
