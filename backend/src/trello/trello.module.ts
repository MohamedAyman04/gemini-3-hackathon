import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrelloService } from './trello.service';

@Module({
  imports: [ConfigModule],
  providers: [TrelloService],
  exports: [TrelloService],
})
export class TrelloModule {}
