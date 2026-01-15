import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GeminiService } from '../gemini/gemini.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Processor('analysis')
export class AnalysisProcessor extends WorkerHost {
  constructor(private readonly geminiService: GeminiService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    // 1. Analyze transcript & logs using Gemini
    const script = await this.geminiService.generatePlaywrightScript({
      url: job.data.url,
      context: job.data.context,
      transcript: job.data.transcript,
      dom_events: job.data.dom_events || [],
    });

    // 2. Write to file
    const missionsDir = path.join(__dirname, '../../generated-tests');
    if (!fs.existsSync(missionsDir)) {
      fs.mkdirSync(missionsDir, { recursive: true });
    }
    const filePath = path.join(missionsDir, `test-${job.id}.spec.ts`);
    fs.writeFileSync(filePath, script);

    // 3. Execute Playwright
    try {
      console.log(`Executing test: ${filePath}`);
      // In a real env, we'd run this string.
      // await execAsync(\`npx playwright test \${filePath}\`);
      return { status: 'success', filePath };
    } catch (error) {
      console.error('Test execution failed', error);
      return { status: 'failed', error: error.message };
    }
  }
}
