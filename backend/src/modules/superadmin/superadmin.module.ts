import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminService, PrismaService, AuthService, JwtService, ConfigService],
  exports: [SuperadminService],
})
export class SuperadminModule {}