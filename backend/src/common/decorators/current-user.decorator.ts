import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extracts `user` from request (attached by JwtStrategy)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
