import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Update the profile for the current user.
   * Throws if user not found or email is already taken by another user.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
      where: { id: userId },
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

    return { message: 'Password changed successfully.' };
  }
}
