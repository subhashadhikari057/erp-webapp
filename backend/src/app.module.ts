import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { RATE_LIMIT_CONFIG } from './config/rate-limit.config';

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
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
