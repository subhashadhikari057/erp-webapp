import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  CanActivate,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RATE_LIMIT_CONFIG } from '../../config/rate-limit.config';
import { AuthService } from '../../modules/auth/auth.service';

interface RateLimitData {
  count: number;
  windowStart: number;
  lastReset: number;
}

@Injectable()
export class CustomThrottlerGuard implements CanActivate {
  // In-memory storage for rate limiting
  private readonly rateLimitStore = new Map<string, RateLimitData>();
  
  // In-memory storage for blocked IPs
  private readonly blockedIPs = new Map<string, number>();

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = this.getClientIP(request);
    
    // Check if IP is currently blocked
    if (this.isIPBlocked(ip)) {
      const blockedUntil = this.blockedIPs.get(ip)!;
      const remainingTime = Math.ceil((blockedUntil - Date.now()) / 1000);
      
      await this.logSecurityEvent(request, 'BLOCKED_ACCESS_ATTEMPT', {
        ip,
        remainingTime,
        route: `${request.method} ${request.url}`,
      });

      throw new HttpException(
        {
          message: `Too many requests. IP blocked for ${Math.ceil(remainingTime / 60)} more minutes.`,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate Limit Exceeded',
          retryAfter: remainingTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Determine rate limits based on endpoint
    const { limit, ttl } = this.getRateLimitsForEndpoint(request);
    const key = this.generateKey(request, ip);
    
    // Check rate limit
    const rateLimitData = this.checkRateLimit(key, limit, ttl);
    
    // Add rate limit headers
    this.addRateLimitHeaders(response, limit, rateLimitData);
    
    if (rateLimitData.count > limit) {
      // Rate limit exceeded
      await this.handleRateLimitExceeded(request, ip);
      
      throw new HttpException(
        {
          message: 'Rate limit exceeded. Further violations may result in temporary blocking.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate Limit Exceeded',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIP(request: Request): string {
    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  private generateKey(request: Request, ip: string): string {
    const route = `${request.method}:${request.route?.path || request.url}`;
    return `${route}:${ip}`;
  }

  private getRateLimitsForEndpoint(request: Request): { limit: number; ttl: number } {
    const isAuthEndpoint = request.url.includes('/auth/');
    
    if (isAuthEndpoint) {
      if (request.url.includes('/login')) {
        return { limit: RATE_LIMIT_CONFIG.authLimit, ttl: RATE_LIMIT_CONFIG.authTtl };
      } else if (request.url.includes('/refresh')) {
        return { limit: RATE_LIMIT_CONFIG.authRefreshLimit, ttl: RATE_LIMIT_CONFIG.authTtl };
      } else if (request.url.includes('/logout')) {
        return { limit: RATE_LIMIT_CONFIG.authLogoutLimit, ttl: RATE_LIMIT_CONFIG.defaultTtl };
      }
    }
    
    return { limit: RATE_LIMIT_CONFIG.defaultLimit, ttl: RATE_LIMIT_CONFIG.defaultTtl };
  }

  private checkRateLimit(key: string, limit: number, ttl: number): RateLimitData {
    const now = Date.now();
    const existing = this.rateLimitStore.get(key);
    
    if (!existing || now - existing.windowStart > ttl) {
      // New window or expired window
      const newData: RateLimitData = {
        count: 1,
        windowStart: now,
        lastReset: now + ttl,
      };
      this.rateLimitStore.set(key, newData);
      return newData;
    }
    
    // Increment count in existing window
    existing.count++;
    this.rateLimitStore.set(key, existing);
    return existing;
  }

  private addRateLimitHeaders(response: Response, limit: number, rateLimitData: RateLimitData): void {
    response.header('X-RateLimit-Limit', limit.toString());
    response.header('X-RateLimit-Remaining', Math.max(0, limit - rateLimitData.count).toString());
    response.header('X-RateLimit-Reset', rateLimitData.lastReset.toString());
  }

  private isIPBlocked(ip: string): boolean {
    const blockedUntil = this.blockedIPs.get(ip);
    if (!blockedUntil) return false;
    
    if (Date.now() > blockedUntil) {
      // Block expired, remove from blocked list
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  private async handleRateLimitExceeded(request: Request, ip: string): Promise<void> {
    const isAuthEndpoint = request.url.includes('/auth/');
    
    if (isAuthEndpoint && RATE_LIMIT_CONFIG.enableBlocking) {
      // For auth endpoints, block IP after rate limit exceeded
      const blockUntil = Date.now() + RATE_LIMIT_CONFIG.blockDuration;
      this.blockedIPs.set(ip, blockUntil);
      
      await this.logSecurityEvent(request, 'IP_BLOCKED', {
        ip,
        reason: 'Auth rate limit exceeded',
        blockDuration: RATE_LIMIT_CONFIG.blockDuration / 1000,
        route: `${request.method} ${request.url}`,
      });
    } else {
      // For other endpoints, just log the violation
      await this.logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED', {
        ip,
        route: `${request.method} ${request.url}`,
      });
    }
  }

  private async logSecurityEvent(request: Request, type: string, details: any): Promise<void> {
    if (!RATE_LIMIT_CONFIG.logViolations) return;
    
    const timestamp = new Date().toISOString();
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = details.ip || this.getClientIP(request);
    
    // Log to console for immediate visibility
    console.log(`[SECURITY] ${timestamp} - ${type}:`, {
      ...details,
      userAgent,
      headers: {
        origin: request.headers.origin,
        referer: request.headers.referer,
      },
    });
    
    // For auth endpoints, also log to database using existing auth logging
    const isAuthEndpoint = request.url.includes('/auth/');
    if (isAuthEndpoint && this.authService) {
      try {
        await this.authService.logAuthEvent({
          userId: undefined,
          companyId: undefined,
          ip,
          userAgent,
          type: 'FAIL',
          success: false,
        });
      } catch (error) {
        console.error('Failed to log auth event:', error);
      }
    }
  }
}