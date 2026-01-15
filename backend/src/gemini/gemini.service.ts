import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async generatePlaywrightScript(data: {
    url: string;
    context: string;
    transcript: string;
    dom_events: any[];
  }): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are an expert QA Engineer. Your task is to generate a Playwright (TypeScript) test script that reproduces a bug reported by a user.
      
      MISSION CONTEXT: ${data.context}
      TARGET URL: ${data.url}
      USER TRANSCRIPT: "${data.transcript}"
      
      DOM EVENTS (JSON):
      ${JSON.stringify(data.dom_events, null, 2)}
      
      REQUIREMENTS:
      1. Output ONLY a valid TypeScript file content.
      2. No markdown blocks (no \`\`\`typescript ... \`\`\`).
      3. Use '@playwright/test'.
      4. The test should attempt to perform the same actions the user did to encounter the bug.
      5. Include comments explaining each step.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up markdown if Gemini adds it despite instructions
      text = text
        .replace(/```typescript/g, '')
        .replace(/```/g, '')
        .trim();

      return text;
    } catch (error) {
      this.logger.error('Gemini Script Generation failed', error);
      throw error;
    }
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ]);
    return result.response.text();
  }

  createLiveSession(sessionId: string, onAudioDelta: (audio: Buffer) => void) {
    this.logger.log(`Creating Live Session for ${sessionId}`);
    // ... (Live API implementation would go here)
    return {
      sendAudio: (chunk: Buffer) => {},
      close: () => {},
    };
  }
}
