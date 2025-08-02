import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
