import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { 
  TenantInfo, 
  TenantResolutionResult
} from '../types/tenant-context.type';
import { TenantResolutionSource } from '../types/tenant-context.type';

/**
 * Tenant Resolver Service
 * 
 * This service handles the core logic of resolving tenant information
 * from various sources (subdomain, headers, JWT payload).
 * 
 * It includes caching and validation to ensure performance and security.
 */

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  
  // Simple in-memory cache for tenant lookups
  // In production, you might want to use Redis
  private tenantCache = new Map<string, TenantInfo>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  /**
   * Resolve tenant from subdomain (abc.myerp.com → abc)
   * This is the primary method for tenant resolution
   */
  async resolveFromSubdomain(subdomain: string): Promise<TenantResolutionResult> {
    if (!subdomain) {
      return {
        success: false,
        source: TenantResolutionSource.SUBDOMAIN,
        error: 'No subdomain provided'
      };
    }

    try {
      // Check cache first
      const cached = this.getCachedTenant(subdomain);
      if (cached) {
        this.logger.debug(`Tenant resolved from cache: ${subdomain} → ${cached.name}`);
        return {
          success: true,
          tenantId: cached.id,
          tenantInfo: cached,
          source: TenantResolutionSource.SUBDOMAIN
        };
      }

      // Lookup from database
      const company = await this.prisma.company.findUnique({
        where: { 
          subdomain: subdomain.toLowerCase(),
          isActive: true  // Only active companies
        }
      });

      if (!company) {
        this.logger.warn(`No active company found for subdomain: ${subdomain}`);
        return {
          success: false,
          source: TenantResolutionSource.SUBDOMAIN,
          error: `No active company found for subdomain: ${subdomain}`
        };
      }

      const tenantInfo: TenantInfo = {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        isActive: company.isActive
      };

      // Cache the result
      this.setCachedTenant(subdomain, tenantInfo);

      this.logger.debug(`Tenant resolved from database: ${subdomain} → ${company.name}`);
      
      return {
        success: true,
        tenantId: company.id,
        tenantInfo,
        source: TenantResolutionSource.SUBDOMAIN
      };

    } catch (error) {
      this.logger.error(`Error resolving tenant from subdomain ${subdomain}:`, error);
      return {
        success: false,
        source: TenantResolutionSource.SUBDOMAIN,
        error: `Database error: ${error.message}`
      };
    }
  }

  /**
   * Resolve tenant from JWT payload (when user is authenticated)
   * This takes priority over subdomain resolution
   */
  async resolveFromJWT(companyId: string): Promise<TenantResolutionResult> {
    if (!companyId) {
      return {
        success: false,
        source: TenantResolutionSource.JWT,
        error: 'No company ID in JWT payload'
      };
    }

    try {
      // For JWT resolution, we trust the company ID from the token
      // but we still validate it exists and is active
      const company = await this.prisma.company.findUnique({
        where: { 
          id: companyId,
          isActive: true
        }
      });

      if (!company) {
        this.logger.warn(`Invalid company ID from JWT: ${companyId}`);
        return {
          success: false,
          source: TenantResolutionSource.JWT,
          error: `Invalid or inactive company ID: ${companyId}`
        };
      }

      const tenantInfo: TenantInfo = {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        isActive: company.isActive
      };

      // Cache by both ID and subdomain for faster lookups
      this.setCachedTenant(company.subdomain, tenantInfo);

      this.logger.debug(`Tenant resolved from JWT: ${companyId} → ${company.name}`);
      
      return {
        success: true,
        tenantId: company.id,
        tenantInfo,
        source: TenantResolutionSource.JWT
      };

    } catch (error) {
      this.logger.error(`Error resolving tenant from JWT ${companyId}:`, error);
      return {
        success: false,
        source: TenantResolutionSource.JWT,
        error: `Database error: ${error.message}`
      };
    }
  }

  /**
   * Resolve tenant from HTTP header (X-Company-Id)
   * This is a fallback for API clients that can't use subdomains
   */
  async resolveFromHeader(companyId: string): Promise<TenantResolutionResult> {
    if (!companyId) {
      return {
        success: false,
        source: TenantResolutionSource.HEADER,
        error: 'No company ID in header'
      };
    }

    // Same logic as JWT resolution, but different source
    const result = await this.resolveFromJWT(companyId);
    return {
      ...result,
      source: TenantResolutionSource.HEADER
    };
  }

  /**
   * Cache management for performance
   */
  private getCachedTenant(key: string): TenantInfo | null {
    const cached = this.tenantCache.get(key);
    const timestamp = this.cacheTimestamps.get(key);
    
    if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
      return cached;
    }
    
    // Cache expired
    this.tenantCache.delete(key);
    this.cacheTimestamps.delete(key);
    return null;
  }

  private setCachedTenant(key: string, tenant: TenantInfo): void {
    this.tenantCache.set(key, tenant);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear cache (useful for testing or when companies are updated)
   */
  clearCache(): void {
    this.tenantCache.clear();
    this.cacheTimestamps.clear();
    this.logger.debug('Tenant cache cleared');
  }
}