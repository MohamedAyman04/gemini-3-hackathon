import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private apiKey: string | undefined;
  private genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    console.log('Gemini API Key:', this.apiKey ? 'Loaded' : 'Not Set');

    if (!this.apiKey) {
      this.logger.error(
        'GEMINI_API_KEY environment variable is not set. Please set it before using Gemini features.',
      );
      throw new Error(
        'GEMINI_API_KEY is required. Please set the GEMINI_API_KEY environment variable.',
      );
    }

    this.genAI = new GoogleGenAI({
      apiKey: this.apiKey,
    });
  }

  onModuleInit() {
    this.logger.log('Gemini Service Initialized');
  }

  async generatePlaywrightScript(data: {
    url: string;
    context: string;
    transcript: string;
    dom_events: any[];
  }): Promise<string> {
    const promptTemplate =
      this.loadPromptTemplate() || this.getFallbackPrompt();

    const fullPrompt = promptTemplate
      .replace(/\{\{context\}\}/g, data.context)
      .replace(/\{\{url\}\}/g, data.url)
      .replace(/\{\{transcript\}\}/g, data.transcript)
      .replace(/\{\{dom_events\}\}/g, JSON.stringify(data.dom_events, null, 2));

    try {
      this.logger.log('Calling Gemini (Unified SDK) for script generation...');

      // New Pattern: client.models.generateContent
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      });

      let text = response.text || '';

      // Clean up markdown blocks
      return text.replace(/```typescript|```/g, '').trim();
    } catch (error) {
      this.logger.error('Gemini Script Generation failed', error);
      throw error;
    }
  }

  /**
   * Searches for the prompt template in common project locations.
   * Returns the file content or null if not found.
   */
  private loadPromptTemplate(): string | null {
    const fileName = 'repro_script.txt';

    // We try to find the path relative to the PROJECT ROOT first (most reliable in dev/docker)
    // then relative to the CURRENT FILE (backwards compatibility).
    const possiblePaths = [
      // 1. Project Root -> prompts/bugs/repro_script.txt
      path.join(process.cwd(), 'prompts', 'bugs', fileName),

      // 2. Project Root -> src/prompts/bugs/repro_script.txt (if prompts are inside src)
      path.join(process.cwd(), 'src', 'prompts', 'bugs', fileName),

      // 3. Relative to compiled file (dist/services/gemini.service.js)
      // Goes up 3 levels: services -> dist -> project root -> prompts
      path.join(__dirname, '..', '..', 'prompts', 'bugs', fileName),
    ];

    for (const promptPath of possiblePaths) {
      try {
        if (fs.existsSync(promptPath)) {
          const content = fs.readFileSync(promptPath, 'utf8');
          this.logger.log(
            `Successfully loaded prompt template from: ${promptPath}`,
          );
          return content;
        }
      } catch (err) {
        this.logger.error(`Error reading path ${promptPath}: ${err.message}`);
      }
    }

    this.logger.warn(
      `Could not find ${fileName} in any of: ${possiblePaths.join(', ')}`,
    );
    return null;
  }

  /**
   * Returns a hardcoded prompt if the external file is missing.
   * This ensures the service remains functional.
   */
  private getFallbackPrompt(): string {
    return `
      You are an expert QA Automation Engineer.
      Your goal is to generate a Playwright (TypeScript) script to reproduce a reported bug.
      
      CONTEXT: {{context}}
      URL: {{url}}
      USER TRANSCRIPT: {{transcript}}
      
      DOM EVENTS DATA:
      {{dom_events}}
      
      INSTRUCTIONS:
      1. Write a complete Playwright test using @playwright/test.
      2. Follow the user's steps exactly as described in the transcript and DOM events.
      3. Use 'expect' to assert that the bug or expected state occurs.
      4. Output ONLY the TypeScript code, no markdown formatting.
    `.trim();
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: imageBuffer.toString('base64'),
                  mimeType: 'image/jpeg',
                },
              },
            ],
          },
        ],
      });
      return response.text || '';
    } catch (error) {
      this.logger.error('Image analysis failed', error);
      throw error;
    }
  }

  async generateSessionSummary(transcript: string, logs: any[]): Promise<string> {
    try {
      const prompt = `
        You are an expert user researcher.
        Analyze the following session data and provide a concise summary of the user's experience.
        Focus on:
        1. Key actions performed.
        2. any frustrations or bugs encountered.
        3. Overall sentiment.

        TRANSCRIPT:
        ${transcript || 'No transcript available.'}

        LOGS (First 50 events):
        ${JSON.stringify(logs.slice(0, 50), null, 2)}
      `;

      const response = await this.genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      return response.text || 'No summary generated.';
    } catch (error) {
      this.logger.error('Session summary generation failed', error);
      return 'Failed to generate summary.';
    }
  }

  createLiveSession(
    sessionId: string,
    onAudioDelta: (audio: string) => void,
    onIntervention: (trigger: string) => void,
    onText: (text: string) => void,
    missionContext: { url?: string; context?: string } = {},
  ) {
    this.logger.log(`Creating Live Session for ${sessionId}`);

    // ... (System prompt logic remains the same) ...
    const systemInstruction = `You are an AI assistant helping with: ${missionContext.context}`;

    // Note: The Web-SDK version of @google/genai often provides a helper,
    // but for Node.js backends, the WebSocket URL remains the most stable path:
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.configService.get('GEMINI_API_KEY')}`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
      const setup_msg = {
        setup: {
          model: 'gemini-3-flash-preview',
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          },
        },
      };
      ws.send(JSON.stringify(setup_msg));
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      const audio =
        response.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audio) onAudioDelta(audio);

      const text = response.serverContent?.modelTurn?.parts?.[0]?.text;
      if (text) {
        if (text.includes('REPORT_BUG')) {
          onIntervention('REPORT_BUG');
        } else {
          onText(text);
        }
      }
    });

    return {
      sendAudio: (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: chunk.toString('base64'),
                  },
                ],
              },
            }),
          );
        }
      },
      sendImage: (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'image/jpeg',
                    data: chunk.toString('base64'),
                  },
                ],
              },
            })
          );
        }
      },
      close: () => ws.close(),
    };
  }
}
