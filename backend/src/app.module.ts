import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MissionsModule } from './missions/missions.module';
import { SessionsModule } from './sessions/sessions.module';
import { AnalysisModule } from './analysis/analysis.module';
import { GeminiModule } from './gemini/gemini.module';
import { GeminiService } from './gemini/gemini.service';
import { AuthModule } from './auth/auth.module';
import { JiraModule } from './jira/jira.module';
import { TrelloModule } from './trello/trello.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        // port: configService.get<number>('POSTGRES_PORT', 5432),
        // username: configService.get<string>('POSTGRES_USER', 'postgres'),
        // password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
        // database: configService.get<string>('POSTGRES_DB', 'vibecheck'),
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: true,
        ssl: process.env.NODE_ENV === 'production',
        extra:
          process.env.NODE_ENV === 'production'
            ? {
              ssl: {
                rejectUnauthorized: false, // Required for Render's self-signed certificates
              },
            }
            : undefined,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6380),
          password: configService.get<string>('REDIS_PASSWORD'),
          tls:
            configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
      inject: [ConfigService],
    }),
    MissionsModule,
    SessionsModule,
    AnalysisModule,
    GeminiModule,
    AuthModule,
    JiraModule,
    TrelloModule,
  ],
  controllers: [AppController],
  providers: [AppService, GeminiService],
})
export class AppModule { }
