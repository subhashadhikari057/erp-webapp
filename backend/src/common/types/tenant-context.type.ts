/**
 * Tenant Context Types
 * 
 * These types define how we handle multi-tenant information throughout the application.
 * They provide type safety and clear interfaces for tenant-related operations.
 */

export interface TenantInfo {
  id: string;           // Company UUID from database
  name: string;         // Company name (e.g., "ABC Corporation")
  subdomain: string;    // URL subdomain (e.g., "abc")
  isActive: boolean;    // Whether company is enabled
}

export interface TenantContext {
  tenantId: string;     // Quick access to company ID
  tenantInfo?: TenantInfo; // Full company information (optional for performance)
}

export enum TenantResolutionSource {
  JWT = 'jwt',           // Resolved from authenticated user's company
  SUBDOMAIN = 'subdomain', // Resolved from URL subdomain (abc.myerp.com)
  HEADER = 'header',     // Resolved from X-Company-Id header
  FALLBACK = 'fallback'  // Default/fallback resolution
}

export interface TenantResolutionResult {
  success: boolean;
  tenantId?: string;
  tenantInfo?: TenantInfo;
  source: TenantResolutionSource;
  error?: string;
}

// Request interface extension for tenant context
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      tenantResolution?: TenantResolutionResult;
    }
  }
}