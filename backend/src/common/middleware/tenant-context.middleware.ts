import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantResolverService } from '../services/tenant-resolver.service';
import type { TenantContext, TenantResolutionResult } from '../types/tenant-context.type';
import { TenantResolutionSource } from '../types/tenant-context.type';
import type { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

/**
 * Tenant Context Middleware
 * 
 * This middleware runs on EVERY request and automatically resolves 
 * which company/tenant the request belongs to.
 * 
 * Resolution Priority:
 * 1. JWT payload (if user is authenticated) - HIGHEST PRIORITY
 * 2. Subdomain (abc.myerp.com) - COMMON CASE  
 * 3. X-Company-Id header - FALLBACK for API clients
 * 
 * After resolution, adds tenant context to request object for use by controllers.
 */

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private tenantResolver: TenantResolverService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    try {
      // First pass: Extract potential tenant sources from request
      const sources = this.extractTenantSources(req);
      
      this.logger.debug(`Resolving tenant for ${req.method} ${req.url}`, {
        hostname: req.hostname,
        subdomain: sources.subdomain,
        hasUser: !!sources.userCompanyId,
        headerCompanyId: sources.headerCompanyId ? 'present' : 'none'
      });

      // Attempt tenant resolution in priority order
      const resolution = await this.resolveTenant(sources);
      
      // Store initial resolution
      req.tenantResolution = resolution;

      if (resolution.success) {
        // Create tenant context for successful resolution
        const tenantContext: TenantContext = {
          tenantId: resolution.tenantId!,
          tenantInfo: resolution.tenantInfo
        };
        
        req.tenantContext = tenantContext;
        
        this.logger.debug(`Tenant resolved successfully`, {
          tenantId: resolution.tenantId,
          tenantName: resolution.tenantInfo?.name,
          source: resolution.source,
          duration: Date.now() - startTime
        });
      } else {
        // Log resolution failure but don't block request
        // Some endpoints (like health checks) don't need tenant context
        this.logger.debug(`Tenant resolution failed: ${resolution.error}`, {
          source: resolution.source,
          url: req.url
        });
      }

    } catch (error) {
      // Never block requests due to tenant resolution errors
      this.logger.error(`Tenant resolution error for ${req.url}:`, error);
      
      req.tenantResolution = {
        success: false,
        source: TenantResolutionSource.FALLBACK,
        error: `Middleware error: ${error.message}`
      };
    }

    next();
  }

  /**
   * Extract all potential tenant sources from the request
   */
  private extractTenantSources(req: Request) {
    // Extract subdomain from hostname
    const hostname = req.hostname || req.headers.host || '';
    const subdomain = this.extractSubdomain(hostname);
    
    // Extract company ID from authenticated user (if present)
    const user = req.user as JwtPayload;
    const userCompanyId = user?.companyId;
    
    // Extract company ID from headers
    const headerCompanyId = req.headers['x-company-id'] as string;
    
    return {
      subdomain,
      userCompanyId,
      headerCompanyId
    };
  }

  /**
   * Resolve tenant using priority-based approach
   */
  private async resolveTenant(sources: {
    subdomain?: string;
    userCompanyId?: string;
    headerCompanyId?: string;
  }): Promise<TenantResolutionResult> {
    
    // Priority 1: JWT payload (authenticated user's company)
    // This takes precedence because it's cryptographically verified
    if (sources.userCompanyId) {
      const result = await this.tenantResolver.resolveFromJWT(sources.userCompanyId);
      if (result.success) {
        return result;
      }
      
      // Log JWT resolution failure but continue to other methods
      this.logger.warn(`JWT tenant resolution failed: ${result.error}`);
    }

    // Priority 2: Subdomain (most common case for web clients)
    // abc.myerp.com → resolve company with subdomain "abc"
    if (sources.subdomain) {
      const result = await this.tenantResolver.resolveFromSubdomain(sources.subdomain);
      if (result.success) {
        return result;
      }
      
      // Log subdomain resolution failure
      this.logger.debug(`Subdomain tenant resolution failed: ${result.error}`);
    }

    // Priority 3: HTTP Header (fallback for API clients)
    // Some mobile apps or API clients might use X-Company-Id header
    if (sources.headerCompanyId) {
      const result = await this.tenantResolver.resolveFromHeader(sources.headerCompanyId);
      if (result.success) {
        return result;
      }
      
      this.logger.debug(`Header tenant resolution failed: ${result.error}`);
    }

    // All resolution methods failed
    return {
      success: false,
      source: TenantResolutionSource.FALLBACK,
      error: 'No valid tenant source found (no JWT company, subdomain, or header)'
    };
  }

  /**
   * Extract subdomain from hostname
   * Examples:
   * - abc.myerp.com → "abc"
   * - localhost:3000 → null (for local development)
   * - myerp.com → null (main domain)
   */
  private extractSubdomain(hostname: string): string | undefined {
    if (!hostname) return undefined;
    
    // Handle localhost and IP addresses (development)
    if (hostname.includes('localhost') || hostname.match(/^\d+\.\d+\.\d+\.\d+/)) {
      return undefined;
    }
    
    // Split hostname and check for subdomain
    const parts = hostname.split('.');
    
    // Need at least 3 parts for subdomain (subdomain.domain.com)
    if (parts.length >= 3) {
      const subdomain = parts[0];
      
      // Ignore common non-tenant subdomains
      if (subdomain && !['www', 'api', 'admin'].includes(subdomain)) {
        return subdomain.toLowerCase();
      }
    }
    
    return undefined;
  }
}