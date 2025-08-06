import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_TENANT_KEY, TenantRequirement } from '../decorators/require-tenant.decorator';
import type { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
import type { TenantContext } from '../types/tenant-context.type';

/**
 * TenantGuard
 * 
 * Enforces tenant access validation and data isolation:
 * - Ensures users can only access data from their own company
 * - Validates tenant context is properly resolved
 * - Allows configurable superadmin bypass
 * - Works with existing tenant context infrastructure
 * 
 * Execution Order:
 * 1. Middleware (basic tenant resolution)
 * 2. JwtGuard (authentication)
 * 3. TenantContextInterceptor (tenant enhancement)
 * 4. TenantGuard (THIS - tenant access validation)
 * 5. RoleGuard (permission validation)
 * 6. Controller
 */

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get tenant requirement metadata from decorator
    const tenantRequirement = this.reflector.getAllAndOverride<TenantRequirement>(
      REQUIRE_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @RequireTenant() decorator, allow access
    if (!tenantRequirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;
    const tenantContext: TenantContext | undefined = request.tenantContext;

    // Ensure user is authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required for tenant access');
    }

    // Check if superadmin bypass is allowed
    if (tenantRequirement.allowSuperadmin && this.isSuperadmin(user)) {
      this.logger.debug(`Superadmin ${user.userId} bypassing tenant validation`);
      return true;
    }

    // Validate user has a company
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company to access tenant resources');
    }

    // Validate tenant context based on mode
    return this.validateTenantAccess(tenantRequirement, user, tenantContext);
  }

  private validateTenantAccess(
    requirement: TenantRequirement,
    user: JwtPayload,
    tenantContext: TenantContext | undefined
  ): boolean {
    switch (requirement.mode) {
      case 'basic':
        return this.validateBasicAccess(user, tenantContext);
      
      case 'strict':
        return this.validateStrictAccess(user, tenantContext);
      
      case 'allow-superadmin':
        return this.validateBasicAccess(user, tenantContext);
      
      case 'block-superadmin':
        // Even superadmin must have valid tenant context
        return this.validateStrictAccess(user, tenantContext);
      
      default:
        throw new BadRequestException(`Invalid tenant requirement mode: ${requirement.mode}`);
    }
  }

  private validateBasicAccess(user: JwtPayload, tenantContext: TenantContext | undefined): boolean {
    // Basic validation: user must have companyId
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // If we have tenant context, verify it matches user's company
    if (tenantContext && tenantContext.tenantId !== user.companyId) {
      this.logger.warn(
        `Tenant context mismatch: user company ${user.companyId} != context ${tenantContext.tenantId}`
      );
      throw new ForbiddenException('Tenant context does not match user company');
    }

    this.logger.debug(`Basic tenant access validated for user ${user.userId} in company ${user.companyId}`);
    return true;
  }

  private validateStrictAccess(user: JwtPayload, tenantContext: TenantContext | undefined): boolean {
    // Strict validation: must have full tenant context with database info
    if (!tenantContext) {
      throw new ForbiddenException(
        'Tenant context not found. Ensure TenantContextInterceptor is applied to this endpoint.'
      );
    }

    if (!tenantContext.tenantInfo) {
      throw new ForbiddenException(
        'Complete tenant information not available. Company may be inactive or not found.'
      );
    }

    // Verify tenant context matches user's company
    if (tenantContext.tenantId !== user.companyId) {
      this.logger.warn(
        `Strict tenant validation failed: user company ${user.companyId} != context ${tenantContext.tenantId}`
      );
      throw new ForbiddenException('Access denied: tenant context mismatch');
    }

    // Verify company is active
    if (!tenantContext.tenantInfo.isActive) {
      throw new ForbiddenException('Access denied: company is not active');
    }

    this.logger.debug(
      `Strict tenant access validated for user ${user.userId} in company ${tenantContext.tenantInfo.name}`
    );
    return true;
  }

  private isSuperadmin(user: JwtPayload): boolean {
    return user.roleIds?.includes('superadmin') || false;
  }
}