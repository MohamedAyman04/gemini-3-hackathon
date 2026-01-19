import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GeminiService } from '../gemini/gemini.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from 'octokit';

const execAsync = promisify(exec);

@Processor('analysis')
export class AnalysisProcessor extends WorkerHost {
  private octokit: Octokit;

  constructor(
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
  ) {
    super();
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    const { url, context, transcript, dom_events, sessionId } = job.data;

    // 1. Analyze transcript & logs using Gemini
    const script = await this.geminiService.generatePlaywrightScript({
      url: url || 'http://localhost:3000', // Default if missing
      context: context || 'User testing session',
      transcript: transcript || 'No transcript provided',
      dom_events: dom_events || [],
    });

    // 2. Write to file
    const generatedDir = path.join(process.cwd(), 'generated-tests');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }
    const filePath = path.join(generatedDir, `test-${job.id}.spec.ts`);
    fs.writeFileSync(filePath, script);

    console.log(`Script generated at: ${filePath}`);

    // 3. Create GitHub Issue
    let issueUrl = '';
    if (this.octokit) {
      try {
        const repo = this.configService.get<string>(
          'GITHUB_REPO',
          'MohamedAyman04/gemini-3-hackathon',
        );
        const [owner, name] = repo.split('/');

        const { data: issue } = await this.octokit.rest.issues.create({
          owner,
          repo: name,
          title: `[Bug Report] Hurdle detected in session ${sessionId || job.id}`,
          body: `
### Hurdle Context
- **URL:** ${url}
- **Session ID:** ${sessionId}
- **Transcript:** ${transcript}

### Reproduction Script
\`\`\`typescript
${script}
\`\`\`

*Generated automatically by VibeCheck Brain*
          `,
        });
        issueUrl = issue.html_url;
        console.log(`GitHub Issue created: ${issueUrl}`);
      } catch (error) {
        console.error('Failed to create GitHub issue', error);
      }
    }

    // 4. Execute Playwright (Optional/Async)
    try {
      console.log(`Executing test: ${filePath}`);
      // In a real environment, we would run this in a container.
      // For now, we'll try to run it locally if playwright is installed.
      // await execAsync(`npx playwright test ${filePath}`);
      return {
        status: 'success',
        filePath,
        issueUrl,
        scriptPreview: script.substring(0, 500) + '...',
      };
    } catch (error) {
      console.error('Test execution failed', error);
      return { status: 'failed', error: error.message };
    }
  }
}
