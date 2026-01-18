import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsGateway } from './sessions.gateway';
import { Session } from './entities/session.entity';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    BullModule.registerQueue({
      name: 'analysis',
    }),
    GeminiModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsGateway],
})
export class SessionsModule {}
