import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const port = configService.get<number>('PORT') || 8080;

  // Connect Prisma
  const prismaService = app.get(PrismaService);
  await prismaService.$connect();

  console.log(`✅ Prisma DB connected`);
  await app.listen(port);
  console.log(`🚀 Server running at http://localhost:${port}`);
}
bootstrap();
