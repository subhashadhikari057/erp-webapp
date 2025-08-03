import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware - set HTTP headers to protect against common attacks
  app.use(helmet({
    // Configure Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Disable X-Powered-By header
    hidePoweredBy: true,
    // Enable HSTS (HTTP Strict Transport Security) for HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent MIME type sniffing
    noSniff: true,
    // Enable XSS filter
    xssFilter: true,
  }));

  // Global validation pipe with clear error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        const constraint = firstError?.constraints && Object.values(firstError.constraints)[0];
        return new BadRequestException(constraint || 'Validation error');
      },
    }),
  );

  // Enable cookies
  app.use(cookieParser());

  // Global rate limiting (applied automatically via @UseGuards or module setup)

  // CORS setup for local frontend
  app.enableCors({
    origin: 'http://localhost:3000', // <-- Change as needed
    credentials: true,
  });

  // Load PORT from env (default to 8080)
  const configService = app.get(ConfigService);
  
  // Global exception filter for consistent error handling
  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  const port = configService.get<number>('PORT') || 8080;

  // Connect Prisma
  const prismaService = app.get(PrismaService);
  await prismaService.$connect();

  console.log(`✅ Prisma DB connected`);
  await app.listen(port);
  console.log(`🚀 Server running at http://localhost:${port}`);
}
bootstrap();
