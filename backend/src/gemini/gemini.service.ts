import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as types from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private apiKey: string | undefined;
  private genAI: types.GoogleGenAI;
  private LIVE_MODEL = 'gemini-3-flash-preview';

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

    this.genAI = new types.GoogleGenAI({
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
      this.logger.log('Calling Gemini for script generation...');

      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      });

      return (response.text || '').replace(/```typescript|```/g, '').trim();
    } catch (error) {
      this.logger.error('Gemini Script Generation failed', error);
      // Fallback to 2.0 if 1.5 is 404
      if (error.status === 404) {
        try {
          const response = await this.genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          });
          return (response.text || '').replace(/```typescript|```/g, '').trim();
        } catch (inner) {
          throw inner;
        }
      }
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
      if (error.status === 404 || error.status === 429) {
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
      }
      this.logger.error('Image analysis failed', error);
      throw error;
    }
  }

  async generateSessionSummary(
    transcript: string,
    logs: any[],
  ): Promise<string> {
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

      try {
        const response = await this.genAI.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return response.text || 'No summary generated.';
      } catch (error) {
        if (error.status === 404 || error.status === 429) {
          const response = await this.genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          return response.text || 'No summary generated.';
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Session summary generation failed', error);
      if (error.status === 429) {
        return 'AI Summary is currently unavailable due to high demand. Please check back later.';
      }
      return 'Failed to generate summary.';
    }
  }

  async createLiveSession(
    sessionId: string,
    onAudio: (audio: string) => void,
    onIntervention: (trigger: string) => void,
    onText: (text: string) => void,
    missionContext: { url?: string; context?: string } = {},
  ) {
    this.logger.log(`Creating Live Session for ${sessionId}`);

    const systemInstruction = `You are an AI assistant helping with: ${missionContext.context}`;

    // Using the SDK helper to match your Hono logic
    const session = await this.genAI.live.connect({
      model: this.LIVE_MODEL,
      config: {
        responseModalities: [types.Modality.AUDIO],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        tools: [{ googleSearch: {} }],
      },
      callbacks: {
        onmessage: (message: types.LiveServerMessage) => {
          // Handle Transcription -> onText
          if (message.serverContent?.outputTranscription) {
            onText(message.serverContent.outputTranscription.text || '');
          }

          // Handle Audio -> onAudio
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            parts.forEach((part) => {
              if (part.inlineData?.data) {
                onAudio(part.inlineData.data);
              }
              // Handle specific triggers -> onIntervention
              if (part.text && part.text.includes('REPORT_BUG')) {
                onIntervention('REPORT_BUG');
              }
            });
          }
        },
      },
    });

    return session;
  }
}
