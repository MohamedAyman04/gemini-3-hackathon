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
  // Offline/Logic Model
  private LOGIC_MODEL = 'gemini-3-flash-preview';
  // Live Streaming Model (Audio/Multimodal)
  private LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    console.log('Gemini API Key:', this.apiKey ? 'Loaded' : 'Not Set');

    if (!this.apiKey) {
      this.logger.error(
        'GEMINI_API_KEY environment variable is not set. Please set it before using Gemini features.',
      );
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. Please set it before using Gemini features.',
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
      .replace(/\{\{transcript\}\}/g, data.transcript);

    try {
      this.logger.log('Calling Gemini (Logic Model) for script generation...');

      const response = await this.genAI.models.generateContent({
        model: this.LOGIC_MODEL,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      });

      return (response.text || '').replace(/```typescript|```/g, '').trim();
    } catch (error) {
      this.logger.error('Gemini Script Generation failed', error);
      // Fallback
      if (error.status === 404) {
        try {
          const response = await this.genAI.models.generateContent({
            model: 'gemini-2.0-flash',
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
      
      INSTRUCTIONS:
      1. Write a complete Playwright test using @playwright/test.
      2. Follow the user's steps exactly as described in the transcript.
      3. Use 'expect' to assert that the bug or expected state occurs.
      4. Output ONLY the TypeScript code, no markdown formatting.
    `.trim();
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.LOGIC_MODEL,
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

  async generateSessionSummary(
    transcript: string,
    logs: any[],
    issues: any[] = [],
  ): Promise<string> {
    try {
      const prompt = `
        You are an expert user researcher.
        Analyze the following session data and provide a concise summary of the user's experience.
        Focus on:
        1. Key actions performed.
        2. A verified list of any frustrations or bugs encountered (use bullet points).
        3. Overall sentiment.

        TRANSCRIPT:
        ${transcript || 'No transcript available.'}

        REPORTED ISSUES (Bugs/Hurdles/Wishes logged by AI during session):
        ${JSON.stringify(issues, null, 2)}
      `;

      try {
        const response = await this.genAI.models.generateContent({
          model: this.LOGIC_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return response.text || 'No summary generated.';
      } catch (error) {
        if (error.status === 404 || error.status === 429) {
          const response = await this.genAI.models.generateContent({
            model: 'gemini-2.0-flash',
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
    onText: (text: string, source: string) => void,
    onLogIssue: (issue: { type: string; description: string }) => void,
    missionContext: { url?: string; context?: string } = {},
  ) {
    this.logger.log(`Creating Live Session for ${sessionId}`);

    const systemInstruction = `
    You are VibeCheck, an expert AI User Researcher participating in a live user testing session.
    Your goal is to observe the user, listen to their feedback, and DOCUMENT every issue they encounter using the 'log_issue' tool.
    
    CONTEXT:
    Mission: ${missionContext.context}
    Target URL: ${missionContext.url}

    BEHAVIOR:
    1.  **Active Listening**: Listen for signs of frustration ("Ugh", "It's not working") or explicit reports ("Start recording a bug").
    2.  **Proactive Documentation**: 
        - When the user describes a problem, IMMEDIATELY call the \`log_issue\` function.
        - Classify it as:
          - 'bug': Something is broken or throwing an error.
          - 'hurdle': Not broken, but confusing or hard to use.
          - 'wish': A feature request or suggestion.
    3.  **Concise Interaction**:
        - Keep your voice responses short and conversational. 
        - After logging an issue, confirm to the user: "Got it, I've logged that bug."
        - Do not act like a generic assistant. You are a researcher.

    TOOLS:
    - You have a tool \`log_issue\`. USE IT FREQUENTLY. 
    - Do not just write the bug in the transcript. You must call the tool.
    `.trim();

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'log_issue',
            description: 'Logs a user-reported bug, hurdle, or wish during the testing session.',
            parameters: {
              type: types.Type.OBJECT,
              properties: {
                type: {
                  type: types.Type.STRING,
                  description: 'The type of issue.',
                  enum: ['bug', 'hurdle', 'wish'],
                },
                description: {
                  type: types.Type.STRING,
                  description: 'A concise description of the issue or feedback.',
                },
              },
              required: ['type', 'description'],
            },
          },
        ],
      },
    ];

    // Using the SDK helper to match your Hono logic
    const session = await this.genAI.live.connect({
      model: this.LIVE_MODEL,
      config: {
        responseModalities: [types.Modality.AUDIO],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        tools: tools,
      },
      callbacks: {
        onopen: () => {
          this.logger.log('Gemini Live WebSocket Opened');
        },
        onerror: (error) => {
          this.logger.error('Gemini Live WebSocket Error', error);
        },
        onclose: (event) => {
          this.logger.warn(`Gemini Live WebSocket Closed: ${event.code} - ${event.reason}`);
        },
        onmessage: (message: types.LiveServerMessage) => {
          // Handle Interruption
          if (message.serverContent?.interrupted) {
            this.logger.log('Gemini Interrupted');
            onIntervention('INTERRUPTED');
          }

          // Handle AI Output Transcription
          if (message.serverContent?.outputTranscription) {
            onText(message.serverContent.outputTranscription.text || '', 'AI');
          }

          // Handle User Input Transcription
          // Docs say: turn.serverContent.inputTranscription
          const anyContent = message.serverContent as any;
          if (anyContent?.inputTranscription) {
            const text = anyContent.inputTranscription.text;
            if (text) {
              onText(text, 'USER');
            }
          }

          // Handle Tool Call (Function Calling)
          if (message.toolCall) {
            const calls = message.toolCall.functionCalls;
            if (calls) {
              calls.forEach((call) => {
                if (call.name === 'log_issue') {
                  const args = call.args as any;
                  this.logger.log(`Tool Call: log_issue [${args.type}] ${args.description}`);
                  onLogIssue({
                    type: args.type,
                    description: args.description,
                  });

                  // We *should* technically rely with toolResponse, but currently the SDK/Live API 
                  // might be okay with just performing the side effect if we don't need the model to "read" the result immediately in the audio loop.
                  // For now, we perform the side effect.
                }
              });
            }
          }

          // Handle Audio -> onAudio
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            parts.forEach((part) => {
              if (part.inlineData?.data) {
                // this.logger.log(`Received Audio Chunk`); 
                onAudio(part.inlineData.data);
              }
            });
          }
        },
      },
    });

    this.logger.log('Gemini Live Session Correctly Connected');
    return session;
  }
}
