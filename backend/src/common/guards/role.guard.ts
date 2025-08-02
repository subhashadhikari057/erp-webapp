import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { ROLES_KEY } from '../decorators/roles.decorator';
  import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
  
  @Injectable()
  export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
  
      if (!requiredRoles) return true;
  
      const request = context.switchToHttp().getRequest();
      const user: JwtPayload = request.user;
  
      const hasRole = user.roleIds.length > 0 && requiredRoles.some((role) =>
        user.roleIds.includes(role)
      );
  
      if (!hasRole) {
        throw new ForbiddenException('You do not have the required role');
      }
  
      return true;
    }
  }
  