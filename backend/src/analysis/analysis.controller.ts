import { Controller, Post, Body } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('test-ai')
  async testAI(@Body() data: any) {
    console.log('Testing AI script generation...');
    const result = await this.geminiService.generatePlaywrightScript({
      url: data.url || 'https://example.com',
      context: data.context || 'Test the login button',
      transcript:
        data.transcript ||
        'I clicked the login button but nothing happened and I am frustrated',
      dom_events: data.dom_events || [
        { type: 'click', target: '#login-button', timestamp: Date.now() },
      ],
    });
    return { script: result };
  }
}
