import { Module } from '@nestjs/common';
import { AnalysisProcessor } from './analysis.processor';

@Module({
  providers: [AnalysisProcessor],
})
export class AnalysisModule {}
