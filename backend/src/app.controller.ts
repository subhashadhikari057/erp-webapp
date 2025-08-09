import { Controller, Get, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { Tenant } from './common/decorators/tenant.decorator';
import { JwtGuard } from './modules/auth/guards/jwt.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import type { TenantInfo, TenantContext } from './common/types/tenant-context.type';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Test endpoint to demonstrate tenant context resolution
   * This shows how different URL patterns resolve to different tenants
   */
  @Get('tenant-info')
  getTenantInfo(@Tenant('context') context: TenantContext) {
    return {
      message: 'Tenant context resolved successfully!',
      tenantId: context.tenantId,
      tenantInfo: context.tenantInfo,
      usage: {
        examples: [
          'Visit abc.myerp.com/tenant-info → Shows ABC Company',
          'Visit xyz.myerp.com/tenant-info → Shows XYZ Company',
          'Use X-Company-Id header → Shows specified company',
          'Login and JWT will override subdomain → Shows user\'s company'
        ]
      }
    };
  }

  /**
   * Simple tenant ID example (most common usage)
   */
  @Get('my-company')
  getMyCompany(@Tenant() tenantId: string) {
    return {
      message: `You are accessing data for company: ${tenantId}`,
      tenantId,
      note: 'This tenantId can be used to filter data in services'
    };
  }

  /**
   * Full tenant info example (requires authentication)
   */
  @Get('company-profile')
  @UseGuards(JwtGuard)
  @UseInterceptors(TenantContextInterceptor)
  getCompanyProfile(@Tenant('info') company: TenantInfo) {
    return {
      profile: {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        isActive: company.isActive,
        websiteUrl: `https://${company.subdomain}.myerp.com`
      }
    };
  }

  /**
   * Debug endpoint to check request state
   */
  @Get('debug-request')
  @UseGuards(JwtGuard)
  debugRequest(@Req() req: any) {
    return {
      user: req.user ? {
        userId: req.user.userId,
        companyId: req.user.companyId,
        roleIds: req.user.roleIds
      } : 'undefined',
      tenantContext: req.tenantContext,
      tenantResolution: req.tenantResolution,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        'x-company-id': req.headers['x-company-id'] || 'missing'
      }
    };
  }
}