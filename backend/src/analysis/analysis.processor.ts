import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GeminiService } from '../gemini/gemini.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from 'octokit';
import { JiraService } from '../jira/jira.service';
import { TrelloService } from '../trello/trello.service';

const execAsync = promisify(exec);

@Processor('analysis')
export class AnalysisProcessor extends WorkerHost {
  private octokit: Octokit;

  constructor(
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
    private readonly jiraService: JiraService,
    private readonly trelloService: TrelloService,
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

    const platforms = job.data.platforms || ['github', 'jira']; // Default to both if not specified
    const title = `[Bug Report] Hurdle detected in session ${sessionId || job.id}`;
    const commonDescription = `
### Hurdle Context
- **URL:** ${url}
- **Session ID:** ${sessionId}
- **Transcript:** ${transcript}

### Reproduction Script
\`\`\`typescript
${script}
\`\`\`

*Generated automatically by VibeCheck Brain*
    `;

    // 3. Create GitHub Issue
    let issueUrl = '';
    if (platforms.includes('github') && this.octokit) {
      try {
        const repo = this.configService.get<string>(
          'GITHUB_REPO',
          'MohamedAyman04/gemini-3-hackathon',
        );
        const [owner, name] = repo.split('/');

        const { data: issue } = await this.octokit.rest.issues.create({
          owner,
          repo: name,
          title: title,
          body: commonDescription,
        });
        issueUrl = issue.html_url;
        console.log(`GitHub Issue created: ${issueUrl}`);
      } catch (error) {
        console.error('Failed to create GitHub issue', error);
      }
    }

    // 4. Create Jira Issue
    let jiraIssueKey = '';
    if (platforms.includes('jira')) {
      try {
        const jiraResult = await this.jiraService.createIssue(
          title,
          `Hurdle Context:
- URL: ${url}
- Session ID: ${sessionId}
- Transcript: ${transcript}

Reproduction script generated and available in GitHub issue: ${issueUrl || 'N/A'}`,
        );
        if (jiraResult.success) {
          jiraIssueKey = jiraResult.key;
          console.log(`Jira Issue created: ${jiraIssueKey}`);
        }
      } catch (error) {
        console.error('Failed to create Jira issue', error);
      }
    }

    // 5. Create Trello Card
    let trelloCardUrl = '';
    if (platforms.includes('trello')) {
      try {
        const trelloResult = await this.trelloService.createCard(
          title,
          `Hurdle Context:
- URL: ${url}
- Session ID: ${sessionId}
- Transcript: ${transcript}

Reproduction script generated and available in GitHub issue: ${issueUrl || 'N/A'}`,
        );
        if (trelloResult.success) {
          trelloCardUrl = trelloResult.url;
          console.log(`Trello Card created: ${trelloCardUrl}`);
        }
      } catch (error) {
        console.error('Failed to create Trello card', error);
      }
    }

    // 6. Execute Playwright (Optional/Async)
    try {
      console.log(`Executing test: ${filePath}`);
      // In a real environment, we would run this in a container.
      // For now, we'll try to run it locally if playwright is installed.
      // await execAsync(`npx playwright test ${filePath}`);
      return {
        status: 'success',
        filePath,
        issueUrl,
        jiraIssueKey,
        trelloCardUrl,
        scriptPreview: script.substring(0, 500) + '...',
      };
    } catch (error) {
      console.error('Test execution failed', error);
      return { status: 'failed', error: error.message };
    }
  }
}
