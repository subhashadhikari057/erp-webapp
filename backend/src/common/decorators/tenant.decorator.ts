import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import 'reflect-metadata';
import type { TenantContext } from '../types/tenant-context.type';

/**
 * @Tenant() Parameter Decorator
 * 
 * This decorator allows controllers to easily access tenant information
 * that was resolved by the TenantContextMiddleware.
 * 
 * Usage Examples:
 * 
 * 1. Get just the tenant ID (most common):
 *    @Get('/users')
 *    getUsers(@Tenant() tenantId: string) { ... }
 * 
 * 2. Get full tenant info:
 *    @Get('/users') 
 *    getUsers(@Tenant('info') tenantInfo: TenantInfo) { ... }
 * 
 * 3. Get entire tenant context:
 *    @Get('/users')
 *    getUsers(@Tenant('context') context: TenantContext) { ... }
 */

export const Tenant = createParamDecorator(
  (data: 'id' | 'info' | 'context' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext: TenantContext = request.tenantContext;
    const user = request.user; // JWT payload if authenticated

    // Priority 1: Use full tenant context if available
    if (tenantContext && tenantContext.tenantInfo) {
      switch (data) {
        case 'info':
          return tenantContext.tenantInfo;
        case 'context':
          return tenantContext;
        case 'id':
        default:
          return tenantContext.tenantId;
      }
    }

    // Priority 2: Use JWT user company if available
    if (user && user.companyId) {
      switch (data) {
        case 'info':
          // Always return a working response - NEVER throw error
          return {
            id: user.companyId,
            name: user.companyId === 'global' ? 'System Administration' : `Company ${user.companyId.slice(0, 8)}...`,
            subdomain: user.companyId === 'global' ? 'admin' : user.companyId.slice(0, 8),
            isActive: true,
            source: 'JWT_FALLBACK'
          };
        case 'context':
          return {
            tenantId: user.companyId,
            tenantInfo: undefined,
            source: 'JWT'
          };
        case 'id':
        default:
          return user.companyId;
      }
    }
    
    // Priority 3: No auth fallback
    switch (data) {
      case 'info':
        return { 
          id: 'unknown', 
          name: 'No Tenant Resolved', 
          subdomain: 'localhost',
          isActive: false,
          source: 'NO_AUTH'
        };
      case 'context':
        return {
          tenantId: 'unknown',
          tenantInfo: undefined,
          source: 'FALLBACK'
        };
      case 'id':
      default:
        return 'unknown';
    }
  },
);

/**
 * @TenantRequired() Class Decorator
 * 
 * This decorator can be applied to entire controllers to ensure
 * that all routes require valid tenant context.
 * 
 * Usage:
 * @TenantRequired()
 * @Controller('admin/users')
 * export class UserController { ... }
 */
export function TenantRequired() {
  return function (target: any) {
    // Mark the class as requiring tenant context
    Reflect.defineMetadata('tenant:required', true, target);
  };
}

/**
 * Helper function to check if a class requires tenant context
 */
export function isTenantRequired(target: any): boolean {
  return Reflect.getMetadata('tenant:required', target) || false;
}