import {
    Controller,
    Get,
    UseGuards,
    NotFoundException,
    Patch,
    Body,
    Post,
    Query,
    Delete,
    Param,
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

  /**
   * Get the currently authenticated user's own audit logs (login/logout/fail).
   * Route: GET /users/me/audit-logs
   * Guard: JWT authentication required
   */
  @UseGuards(JwtGuard)
  @Get('me/audit-logs')
async getOwnAuditLogs(
  @CurrentUser() jwtUser: JwtPayload,
  @Query('page') page?: string
) {
  const pageNum = page ? Math.max(Number(page), 1) : 1;
  return this.userService.getOwnAuditLogs(jwtUser.userId, pageNum, 5);
}


/**
   * Get all active sessions for the current user.
   * Route: GET /users/me/sessions
   */
@UseGuards(JwtGuard)
@Get('me/sessions')
async getMyActiveSessions(@CurrentUser() jwtUser: JwtPayload) {
  return this.userService.getMyActiveSessions(jwtUser.userId);
}

/**
   * Logout from all active sessions (revoke all sessions).
   * Route: DELETE /users/me/sessions
   */
@UseGuards(JwtGuard)
@Delete('me/sessions')
async logoutFromAllSessions(@CurrentUser() jwtUser: JwtPayload) {
  const result = await this.userService.logoutFromAllSessions(jwtUser.userId);
  return result;
}

/**
   * Terminate a specific session by ID.
   * Route: DELETE /users/me/sessions/:sessionId
   */
@UseGuards(JwtGuard)
@Delete('me/sessions/:sessionId')
async terminateSession(
  @CurrentUser() jwtUser: JwtPayload,
  @Param('sessionId') sessionId: string
) {
  const result = await this.userService.terminateSession(jwtUser.userId, sessionId);
  if (!result.success) {
    throw new NotFoundException(result.message);
  }
  return result;
}

}
  