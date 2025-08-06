import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../../auth/types/jwt-payload.type';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has superadmin role
    if (!user.isSuperadmin) {
      throw new ForbiddenException('Superadmin access required');
    }

    return true;
  }
}