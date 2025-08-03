import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminService, PrismaService],
  exports: [SuperadminService],
})
export class SuperadminModule {}