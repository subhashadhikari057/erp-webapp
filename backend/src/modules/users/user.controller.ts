import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequireTenant } from '../../common/decorators/require-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('user')
@UseGuards(JwtGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user's profile with company information
   * Enforces tenant isolation - users can only see their own profile
   */
  @Get('profile')
  @RequireTenant('basic')
  @UseGuards(TenantGuard)
  getUserProfile(
    @CurrentUser() user: JwtPayload,
    @Tenant() tenantId: string
  ) {
    return this.userService.getUserProfile(user.userId, tenantId);
  }

  /**
   * Update current user's profile
   * Enforces tenant isolation - users can only update their own profile
   */
  @Patch('profile')
  @RequireTenant('basic')
  @UseGuards(TenantGuard)
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Tenant() tenantId: string,
    @Body() updateDto: UpdateProfileDto
  ) {
    return this.userService.updateProfile(user.userId, tenantId, updateDto);
  }

  /**
   * Change current user's password
   * Enforces tenant isolation for security
   */
  @Put('change-password')
  @RequireTenant('basic')
  @UseGuards(TenantGuard)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.userService.changePassword(user.userId, changePasswordDto);
  }

  /**
   * Get all users in the same company (for company admins)
   * Enforces tenant isolation - only see users from same company
   */
  @Get('company-users')
  @RequireTenant('basic')
  @UseGuards(TenantGuard)
  getCompanyUsers(
    @CurrentUser() user: JwtPayload,
    @Tenant() tenantId: string
  ) {
    return this.userService.getCompanyUsers(tenantId);
  }
}