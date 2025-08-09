// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantResolverService } from '../../common/services/tenant-resolver.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, TenantResolverService, AuthService, JwtService, ConfigService],
  exports: [UserService],
})
export class UserModule {}
