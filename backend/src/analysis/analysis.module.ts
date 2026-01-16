import { Module } from '@nestjs/common';
import { AnalysisProcessor } from './analysis.processor';
import { AnalysisController } from './analysis.controller';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  providers: [AnalysisProcessor],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
