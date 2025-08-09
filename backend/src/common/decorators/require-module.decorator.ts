import { SetMetadata } from '@nestjs/common';

/**
 * @RequireModule() Decorator
 * 
 * Marks endpoints that require specific company modules to be enabled.
 * Used with ModuleGuard to enforce module-based access control.
 * 
 * Usage Examples:
 * 
 * @RequireModule('HRM') - Requires HRM module to be enabled
 * @RequireModule(['HRM', 'PAYROLL']) - Requires both HRM and PAYROLL modules
 * @RequireModule('ATTENDANCE', { strict: true }) - Strict mode (default)
 * @RequireModule('REPORTS', { allowSuperadmin: false }) - Block superadmin bypass
 * 
 * @param modules - Module name(s) required. Can be single string or array of strings.
 * @param options - Configuration options:
 *   - strict: If true (default), all specified modules must be enabled
 *   - allowSuperadmin: If true (default), superadmin can bypass module checks
 *   - requireAny: If true, at least one of the modules must be enabled (OR logic)
 */

export const REQUIRE_MODULE_KEY = 'require-module';

export type ModuleName = 'HRM' | 'ATTENDANCE' | 'PAYROLL' | 'REPORTS';

export interface ModuleRequirementOptions {
  strict?: boolean;           // All modules must be enabled (default: true)
  allowSuperadmin?: boolean;  // Allow superadmin bypass (default: true)
  requireAny?: boolean;       // Require at least one module (OR logic, default: false)
}

export interface ModuleRequirement {
  modules: ModuleName[];
  options: Required<ModuleRequirementOptions>;
}

export function RequireModule(
  modules: ModuleName | ModuleName[],
  options: ModuleRequirementOptions = {}
) {
  const moduleArray = Array.isArray(modules) ? modules : [modules];
  
  const requirement: ModuleRequirement = {
    modules: moduleArray,
    options: {
      strict: options.strict ?? true,
      allowSuperadmin: options.allowSuperadmin ?? true,
      requireAny: options.requireAny ?? false
    }
  };
  
  return SetMetadata(REQUIRE_MODULE_KEY, requirement);
}