import { Module } from '@nestjs/common';
import { AnalysisProcessor } from './analysis.processor';
import { AnalysisController } from './analysis.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { JiraModule } from '../jira/jira.module';
import { TrelloModule } from '../trello/trello.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GeminiModule, JiraModule, TrelloModule, AuthModule],
  providers: [AnalysisProcessor],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
