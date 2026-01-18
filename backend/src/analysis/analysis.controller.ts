import { Controller, Post, Body, Get } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('health')
  health() {
    return { status: 'ok', message: 'Analysis controller is working' };
  }

  @Post('test-ai')
  async testAI(@Body() data: any) {
    try {
      console.log('=== AI Test Request Started ===');
      console.log('Request data:', JSON.stringify(data, null, 2));

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

      console.log('=== AI generation successful ===');
      console.log('Script length:', result.length);
      return { script: result, success: true };
    } catch (error) {
      console.error('=== AI generation error ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Return a more detailed error response
      return {
        success: false,
        error: error.message,
        errorType: error.name,
        details: error.toString(),
      };
    }
  }
}
