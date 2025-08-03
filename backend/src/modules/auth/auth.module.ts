import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtGuard } from './guards/jwt.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const privateKeyPath = config.get<string>('JWT_PRIVATE_KEY_PATH');
        const publicKeyPath = config.get<string>('JWT_PUBLIC_KEY_PATH');
        
        if (!privateKeyPath || !publicKeyPath) {
          throw new Error('JWT key paths are not configured');
        }
        
        const privateKey = readFileSync(join(process.cwd(), privateKeyPath), 'utf8');
        const publicKey = readFileSync(join(process.cwd(), publicKeyPath), 'utf8');
        
        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: config.get<string>('JWT_ACCESS_TOKEN_EXPIRY') || '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
