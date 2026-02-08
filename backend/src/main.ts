import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable trust proxy to ensure secure cookies work behind reverse proxies (Render, Vercel, etc)
  app.set('trust proxy', 1);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://gemini-3-hackathon.vercel.app',
      /^chrome-extension:\/\//,
    ],
    credentials: true,
  });
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
