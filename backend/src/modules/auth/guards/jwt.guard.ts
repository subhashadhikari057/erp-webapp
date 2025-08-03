import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

// Wraps the passport-jwt strategy
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
