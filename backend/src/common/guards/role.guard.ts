import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { ROLES_KEY } from '../decorators/roles.decorator';
  import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
  import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
  
  @Injectable()
  export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      // Check for new @RequirePermissions decorator first
      let requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      // Fallback to legacy @Roles decorator (for backwards compatibility)
      if (!requiredPermissions) {
        requiredPermissions = this.reflector.getAllAndOverride<string[]>(
          ROLES_KEY,
          [context.getHandler(), context.getClass()],
        );
      }
  
      // If no permissions required, allow access
      if (!requiredPermissions) return true;
  
      const request = context.switchToHttp().getRequest();
      const user: JwtPayload = request.user;

      // Ensure user exists
      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      // Superadmin bypasses all permission checks
      if (user.isSuperadmin) {
        return true;
      }

      // Ensure regular users have permissions
      if (!user.permissions || user.permissions.length === 0) {
        throw new ForbiddenException('No permissions assigned');
      }
  
      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((permission) =>
        user.permissions.includes(permission)
      );
  
      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permission(s): ${requiredPermissions.join(', ')}`
        );
      }
  
      return true;
    }
  }
  