export interface RateLimitConfig {
  // General rate limiting
  defaultTtl: number;
  defaultLimit: number;
  
  // Auth-specific rate limiting
  authTtl: number;
  authLimit: number;
  authRefreshLimit: number;
  authLogoutLimit: number;
  
  // Blocking configuration
  blockDuration: number;
  
  // Security settings
  enableBlocking: boolean;
  logViolations: boolean;
}

export const getRateLimitConfig = (): RateLimitConfig => ({
  // General endpoints: 100 requests per minute
  defaultTtl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  defaultLimit: parseInt(process.env.RATE_LIMIT_DEFAULT || '100', 10),
  
  // Auth endpoints
  authTtl: parseInt(process.env.RATE_LIMIT_AUTH_TTL || '60000', 10),
  authLimit: parseInt(process.env.RATE_LIMIT_AUTH_LOGIN || '5', 10),
  authRefreshLimit: parseInt(process.env.RATE_LIMIT_AUTH_REFRESH || '10', 10),
  authLogoutLimit: parseInt(process.env.RATE_LIMIT_AUTH_LOGOUT || '20', 10),
  
  // Block IP for 15 minutes after auth rate limit exceeded
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || '900000', 10),
  
  // Security features
  enableBlocking: process.env.RATE_LIMIT_ENABLE_BLOCKING !== 'false',
  logViolations: process.env.RATE_LIMIT_LOG_VIOLATIONS !== 'false',
});

export const RATE_LIMIT_CONFIG = getRateLimitConfig();