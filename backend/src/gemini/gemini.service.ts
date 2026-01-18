import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    this.apiKey = 'AIzaSyDb7pY86paUv8mpmqi9IHjrV2uNa6GUQa0';
    console.log('Gemini API Key:', this.apiKey ? 'Loaded' : 'Not Set');

    if (!this.apiKey) {
      this.logger.error(
        'GEMINI_API_KEY environment variable is not set. Please set it before using Gemini features.',
      );
      throw new Error(
        'GEMINI_API_KEY is required. Please set the GEMINI_API_KEY environment variable.',
      );
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async generatePlaywrightScript(data: {
    url: string;
    context: string;
    transcript: string;
    dom_events: any[];
  }): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
    });

    // Try multiple path locations
    const possiblePaths = [
      path.join(process.cwd(), '..', 'prompts', 'bugs', 'repro_script.txt'),
      path.join(process.cwd(), 'prompts', 'bugs', 'repro_script.txt'),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'prompts',
        'bugs',
        'repro_script.txt',
      ),
    ];

    let promptTemplate = '';

    for (const promptPath of possiblePaths) {
      try {
        if (fs.existsSync(promptPath)) {
          promptTemplate = fs.readFileSync(promptPath, 'utf8');
          this.logger.log(`Loaded prompt from: ${promptPath}`);
          break;
        }
      } catch (e) {
        this.logger.error(`Failed to read prompt from ${promptPath}`, e);
        // Continue to next path
      }
    }

    if (!promptTemplate) {
      this.logger.warn('Could not find prompt file, using fallback');
      // Comprehensive fallback prompt
      promptTemplate = `You are an expert QA Engineer. Your task is to generate a Playwright (TypeScript) test script that reproduces a bug reported by a user.

MISSION CONTEXT: {{context}}
TARGET URL: {{url}}
USER TRANSCRIPT: "{{transcript}}"

DOM EVENTS (JSON):
{{dom_events}}

REQUIREMENTS:
1. Output ONLY a valid TypeScript file content.
2. No markdown blocks (no \`\`\`typescript ... \`\`\`).
3. Use '@playwright/test'.
4. The test should attempt to perform the same actions the user did to encounter the bug.
5. Include comments explaining each step.
6. Start with: import { test, expect } from '@playwright/test';
`;
    }

    const prompt = promptTemplate
      .replace(/\{\{context\}\}/g, data.context)
      .replace(/\{\{url\}\}/g, data.url)
      .replace(/\{\{transcript\}\}/g, data.transcript)
      .replace(/\{\{dom_events\}\}/g, JSON.stringify(data.dom_events, null, 2));

    try {
      this.logger.log('Calling Gemini API for script generation...');
      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();

      // Clean up markdown
      text = text
        .replace(/```typescript/g, '')
        .replace(/```/g, '')
        .trim();

      this.logger.log(`Generated script length: ${text.length} characters`);
      return text;
    } catch (error) {
      this.logger.error('Gemini Script Generation failed', error);
      throw error;
    }
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });
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

  createLiveSession(
    sessionId: string,
    onAudioDelta: (audio: string) => void,
    onIntervention: (trigger: string) => void,
    missionContext: { url?: string; context?: string } = {},
  ) {
    this.logger.log(`Creating Live Session for ${sessionId}`);

    // Read system prompt
    const promptPath = path.join(
      process.cwd(),
      '..',
      'prompts',
      'intervention',
      'live_session.txt',
    );
    let systemInstruction = 'You are an AI assistant...';
    try {
      systemInstruction = fs
        .readFileSync(promptPath, 'utf8')
        .replace('{{context}}', missionContext.context || 'Unknown')
        .replace('{{url}}', missionContext.url || 'Unknown');
    } catch (e) {
      this.logger.error(`Failed to read prompt from ${promptPath}`, e);
    }

    // Gemini Multimodal Live API URL
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
      this.logger.log('Gemini Live WebSocket opened');
      // Setup initial config
      const setup_msg = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck',
                },
              },
            },
          },
        },
      };
      ws.send(JSON.stringify(setup_msg));
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());

        // Handle Audio
        if (response.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          const audioBase64 =
            response.serverContent.modelTurn.parts[0].inlineData.data;
          onAudioDelta(audioBase64);
        }

        // Handle Text / Intervension Triggers
        if (response.serverContent?.modelTurn?.parts?.[0]?.text) {
          const text = response.serverContent.modelTurn.parts[0].text;
          this.logger.log(`Gemini Text: ${text}`);

          if (text.includes('REPORT_BUG') || text.includes('TRIGGER_REPORT')) {
            this.logger.log('AI requested a bug report trigger');
            onIntervention('REPORT_BUG');
          }
        }
      } catch (e) {
        this.logger.error('Failed to parse Gemini message', e);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('Gemini Live WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.log('Gemini Live WebSocket closed');
    });

    return {
      sendAudio: (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          const msg = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: chunk.toString('base64'),
                },
              ],
            },
          };
          ws.send(JSON.stringify(msg));
        }
      },
      sendImage: (buffer: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          const msg = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'image/jpeg',
                  data: buffer.toString('base64'),
                },
              ],
            },
          };
          ws.send(JSON.stringify(msg));
        }
      },
      close: () => {
        ws.close();
      },
    };
  }
}
