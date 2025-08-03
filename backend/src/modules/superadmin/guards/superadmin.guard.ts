import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../../auth/types/jwt-payload.type';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has superadmin role
    const isSuperadmin = user.roleIds?.includes('superadmin');
    
    if (!isSuperadmin) {
      throw new ForbiddenException('Superadmin access required');
    }

    return true;
  }
}