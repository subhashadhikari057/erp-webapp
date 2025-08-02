import {
    Controller,
    Get,
    UseGuards,
    NotFoundException,
    Patch,
    Body,
    Post,
  } from '@nestjs/common';
  import { UserService } from './user.service';
  import { JwtGuard } from '../auth/guards/jwt.guard';
  import { CurrentUser } from '../../common/decorators/current-user.decorator';
  import type { JwtPayload } from '../auth/types/jwt-payload.type';
  import { UpdateProfileDto } from './dto/update-profile.dto';
  import { ChangePasswordDto } from './dto/change-password.dto';
  @Controller('users')
  export class UserController {
    constructor(private readonly userService: UserService) {}
  
    /**
     * Get the currently authenticated user's profile info.
     * Route: GET /users/me
     * Guard: JWT authentication required
     */
    @UseGuards(JwtGuard)
    @Get('me')
    async getMe(@CurrentUser() jwtUser: JwtPayload) {
      const user = await this.userService.getBasicUserInfo(jwtUser.userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }


    /**
   * Update the currently authenticated user's profile.
   * Route: PATCH /users/me
   * Guard: JWT authentication required
   */
  @UseGuards(JwtGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() jwtUser: JwtPayload,
    @Body() dto: UpdateProfileDto
  ) {
    const updatedUser = await this.userService.updateProfile(jwtUser.userId, dto);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }



  /**
   * Change password for the currently authenticated user.
   * Route: POST /users/me/change-password
   * Guard: JWT authentication required
   */
  @UseGuards(JwtGuard)
  @Post('me/change-password')
  async changePassword(
    @CurrentUser() jwtUser: JwtPayload,
    @Body() dto: ChangePasswordDto
  ) {
    return this.userService.changePassword(jwtUser.userId, dto);
  }
  }
  