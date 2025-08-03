import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { RATE_LIMIT_CONFIG } from './config/rate-limit.config';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { TenantResolverService } from './common/services/tenant-resolver.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes env variables available app-wide
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: RATE_LIMIT_CONFIG.defaultTtl,
        limit: RATE_LIMIT_CONFIG.defaultLimit,
      },
      {
        name: 'auth',
        ttl: RATE_LIMIT_CONFIG.authTtl,
        limit: RATE_LIMIT_CONFIG.authLimit,
      },
    ]),
    AuthModule,
    UserModule,
    SuperadminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService,
    TenantResolverService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes
    // This runs before any controller and resolves tenant context
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
