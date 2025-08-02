import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JwtPayload } from '../types/jwt-payload.type';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwtPublicKeyPath = config.get<string>('JWT_PUBLIC_KEY_PATH');
    if (!jwtPublicKeyPath) {
      throw new Error('JWT_PUBLIC_KEY_PATH is not configured');
    }

    const jwtPublicKey = readFileSync(join(process.cwd(), jwtPublicKeyPath), 'utf8');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // DEV: read from cookie first, else header
        (req: Request) => req?.cookies?.accessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtPublicKey,
      algorithms: ['RS256'],
    });
  }

  // Attach decoded payload to request.user
  async validate(payload: JwtPayload) {
    return payload; // This becomes `req.user`
  }
}
