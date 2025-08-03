import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantResolverService } from '../services/tenant-resolver.service';
import type { TenantContext } from '../types/tenant-context.type';

/**
 * TenantContextInterceptor
 * 
 * This interceptor runs AFTER guards (including JwtGuard) but BEFORE controllers.
 * It ensures that authenticated users have their full tenant context resolved
 * from the database, not just the basic context from middleware.
 * 
 * Execution Order:
 * 1. Middleware (basic tenant resolution)
 * 2. Guards (JWT authentication)
 * 3. Interceptors (THIS - full tenant resolution) ← You are here
 * 4. Controllers (with complete tenant context)
 */

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  constructor(private readonly tenantResolver: TenantResolverService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Available after JWT guard
    
    // Only enhance tenant context for authenticated users
    if (user && user.companyId) {
      const currentTenantContext = request.tenantContext;
      
      // If we don't have full tenant info, resolve it now
      if (!currentTenantContext || !currentTenantContext.tenantInfo) {
        this.logger.debug(`Enhancing tenant context for user ${user.userId} with company ${user.companyId}`);
        
        try {
          const resolution = await this.tenantResolver.resolveFromJWT(user.companyId);
          
          if (resolution.success) {
            const enhancedTenantContext: TenantContext = {
              tenantId: resolution.tenantId!,
              tenantInfo: resolution.tenantInfo
            };
            
            // Update the request with enhanced tenant context
            request.tenantContext = enhancedTenantContext;
            
            this.logger.debug(`Enhanced tenant context: ${resolution.tenantInfo?.name} (${resolution.tenantId})`);
          } else {
            this.logger.warn(`Failed to enhance tenant context for company ${user.companyId}: ${resolution.error}`);
          }
        } catch (error) {
          this.logger.error(`Error enhancing tenant context: ${error.message}`);
        }
      }
    }

    return next.handle();
  }
}