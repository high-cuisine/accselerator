import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Включаем CORS для работы с client
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 4004);
  console.log(`Server is running on: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
