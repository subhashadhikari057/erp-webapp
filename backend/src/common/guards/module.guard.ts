import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_MODULE_KEY, ModuleRequirement, ModuleName } from '../decorators/require-module.decorator';
import type { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
import type { TenantContext } from '../types/tenant-context.type';

/**
 * ModuleGuard
 * 
 * Enforces module-based access control:
 * - Checks if required company modules are enabled
 * - Supports single or multiple module requirements
 * - Allows configurable superadmin bypass
 * - Works with existing tenant context infrastructure
 * 
 * Execution Order:
 * 1. Middleware (tenant resolution)
 * 2. JwtGuard (authentication)
 * 3. TenantContextInterceptor (tenant enhancement)
 * 4. TenantGuard (tenant validation) 
 * 5. ModuleGuard (THIS - module access validation)
 * 6. RoleGuard (permission validation)
 * 7. Controller
 */

@Injectable()
export class ModuleGuard implements CanActivate {
  private readonly logger = new Logger(ModuleGuard.name);

  // Cache enabled modules per company for performance
  private moduleCache = new Map<string, { modules: Set<ModuleName>; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get module requirement metadata from decorator
    const moduleRequirement = this.reflector.getAllAndOverride<ModuleRequirement>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @RequireModule() decorator, allow access
    if (!moduleRequirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;
    const tenantContext: TenantContext | undefined = request.tenantContext;

    // Ensure user is authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required for module access');
    }

    // Check if superadmin bypass is allowed
    if (moduleRequirement.options.allowSuperadmin && this.isSuperadmin(user)) {
      this.logger.debug(`Superadmin ${user.userId} bypassing module validation for ${moduleRequirement.modules.join(', ')}`);
      return true;
    }

    // Ensure we have tenant context
    if (!tenantContext || !tenantContext.tenantId) {
      throw new ForbiddenException('Tenant context required for module access validation');
    }

    // Get enabled modules for the company
    const enabledModules = await this.getEnabledModules(tenantContext.tenantId);

    // Validate module access
    return this.validateModuleAccess(moduleRequirement, enabledModules, tenantContext.tenantId);
  }

  private async getEnabledModules(companyId: string): Promise<Set<ModuleName>> {
    // Check cache first
    const cached = this.moduleCache.get(companyId);
    if (cached && cached.expires > Date.now()) {
      this.logger.debug(`Cache hit for company ${companyId} modules`);
      return cached.modules;
    }

    // Fetch from database
    this.logger.debug(`Fetching enabled modules for company ${companyId} from database`);
    
    const companyModules = await this.prisma.companyModule.findMany({
      where: {
        companyId,
        enabled: true,
      },
      select: {
        module: true,
      },
    });

    const enabledModules = new Set<ModuleName>(
      companyModules.map(cm => cm.module as ModuleName)
    );

    // Update cache
    this.moduleCache.set(companyId, {
      modules: enabledModules,
      expires: Date.now() + this.CACHE_TTL,
    });

    this.logger.debug(`Company ${companyId} has enabled modules: ${Array.from(enabledModules).join(', ')}`);
    return enabledModules;
  }

  private validateModuleAccess(
    requirement: ModuleRequirement,
    enabledModules: Set<ModuleName>,
    companyId: string
  ): boolean {
    const { modules, options } = requirement;

    if (options.requireAny) {
      // OR logic: at least one module must be enabled
      const hasAnyModule = modules.some(module => enabledModules.has(module));
      
      if (!hasAnyModule) {
        const moduleList = modules.join(', ');
        this.logger.warn(`Access denied: Company ${companyId} needs at least one of [${moduleList}] modules enabled`);
        throw new ForbiddenException(
          `Access denied: This feature requires at least one of the following modules to be enabled: ${moduleList}`
        );
      }

      this.logger.debug(`Module access granted: Company ${companyId} has at least one required module`);
      return true;
    } else {
      // AND logic (default): all modules must be enabled
      const missingModules = modules.filter(module => !enabledModules.has(module));
      
      if (missingModules.length > 0) {
        this.logger.warn(`Access denied: Company ${companyId} missing required modules: ${missingModules.join(', ')}`);
        throw new ForbiddenException(
          `Access denied: This feature requires the following modules to be enabled: ${missingModules.join(', ')}`
        );
      }

      this.logger.debug(`Module access granted: Company ${companyId} has all required modules: ${modules.join(', ')}`);
      return true;
    }
  }

  private isSuperadmin(user: JwtPayload): boolean {
    return user.isSuperadmin || false;
  }

  /**
   * Clear module cache for a specific company (useful after module updates)
   */
  clearModuleCache(companyId: string): void {
    this.moduleCache.delete(companyId);
    this.logger.debug(`Cleared module cache for company ${companyId}`);
  }

  /**
   * Clear all module cache (useful for testing or maintenance)
   */
  clearAllModuleCache(): void {
    this.moduleCache.clear();
    this.logger.debug('Cleared all module cache');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; companies: string[] } {
    return {
      size: this.moduleCache.size,
      companies: Array.from(this.moduleCache.keys())
    };
  }
}