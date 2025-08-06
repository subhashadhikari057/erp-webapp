import { SetMetadata } from '@nestjs/common';

/**
 * @RequireTenant() Decorator
 * 
 * Marks endpoints that require tenant access validation.
 * Used with TenantGuard to enforce data isolation.
 * 
 * Usage Examples:
 * 
 * @RequireTenant() - Basic tenant validation
 * @RequireTenant('strict') - Strict validation (require full tenant info)
 * @RequireTenant('allow-superadmin') - Allow superadmin bypass (default)
 * 
 * @param mode - Validation mode:
 *   - 'basic' (default): Just verify user belongs to a tenant
 *   - 'strict': Require full tenant context with database info
 *   - 'allow-superadmin': Allow superadmin to bypass (default behavior)
 *   - 'block-superadmin': Force superadmin to also have tenant context
 */

export const REQUIRE_TENANT_KEY = 'require-tenant';

export type TenantRequirementMode = 'basic' | 'strict' | 'allow-superadmin' | 'block-superadmin';

export interface TenantRequirement {
  mode: TenantRequirementMode;
  allowSuperadmin: boolean;
}

export const RequireTenant = (mode: TenantRequirementMode = 'basic') => {
  const requirement: TenantRequirement = {
    mode,
    allowSuperadmin: mode !== 'block-superadmin'
  };
  
  return SetMetadata(REQUIRE_TENANT_KEY, requirement);
};