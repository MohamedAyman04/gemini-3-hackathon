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
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';

const execAsync = promisify(exec);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller);

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

    if (job.name === 'process_session_issues') {
      return this.handleProcessSessionIssues(job);
    } else if (job.name === 'reproduce') {
      // Legacy/Fallback for single hurdle
      return this.handleReproduce(job);
    }
  }

  private async handleProcessSessionIssues(job: Job): Promise<any> {
    const { sessionId, issues, videoPath, transcript, logs, url } = job.data;
    const results: any[] = [];

    // Sort issues by timestamp just in case
    const sortedIssues = (issues || []).sort((a, b) => a.timestamp - b.timestamp);

    for (const issue of sortedIssues) {
      try {
        // 1. Extract Media (Screenshot)
        const screenshotPath = await this.extractScreenshot(videoPath, issue.timestamp, job.data.sessionStartTime);

        // 2. Generate Script (Only for Bugs)
        let script = '';
        if (issue.type === 'bug') {
          script = await this.geminiService.generatePlaywrightScript({
            url,
            context: `Bug Report: ${issue.description}`,
            transcript: transcript, // We pass full transcript, maybe should pass partial? Full is better for context.
            dom_events: logs || [] // Passing all logs might be heavy but needed for repro.
          });
        }

        // 3. Create GitHub Issue
        const issueUrl = await this.createGithubIssue(sessionId, issue, script, screenshotPath, url);

        results.push({ issue, status: 'created', url: issueUrl });

      } catch (error) {
        console.error(`Failed to process issue ${issue.description}`, error);
        results.push({ issue, status: 'failed', error: error.message });
      }
    }
    return results;
  }

  private async extractScreenshot(videoPath: string, issueTimestamp: number, sessionStartTime: number): Promise<string | null> {
    if (!fs.existsSync(videoPath)) return null;

    // Calculate offset in seconds
    let offset = (issueTimestamp - sessionStartTime) / 1000;
    if (offset < 0) offset = 0;

    const filename = `screenshot-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
    const outputPath = path.join(path.dirname(videoPath), filename);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [offset],
          filename: filename,
          folder: path.dirname(videoPath),
          size: '1280x720'
        })
        .on('end', () => resolve(outputPath))
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          resolve(null); // Return null on error so we don't block
        });
    });
  }

  private async createGithubIssue(sessionId: string, issue: any, script: string, screenshotPath: string | null, url: string): Promise<string | null> {
    if (!this.octokit) return null;

    const typeEmoji = {
      bug: '🐛',
      hurdle: '🚧',
      wish: '✨'
    };

    const title = `${typeEmoji[issue.type] || '🚩'} [${issue.type.toUpperCase()}] ${issue.description}`;

    let body = `### Issue Details
- **Session ID:** ${sessionId}
- **Type:** ${issue.type}
- **Time:** ${new Date(issue.timestamp).toLocaleTimeString()}
- **URL:** ${url}

### Description
${issue.description}
`;

    if (screenshotPath && fs.existsSync(screenshotPath)) {
      // Since we can't upload to GitHub easily without a separate request, 
      // effectively we might assume this is local. 
      // Ideally we would upload to S3/Cloudinary.
      // For this hackathon, we will skip embedding the image directly unless we have a public URL.
      // OR we can embed base64? GitHub markdown doesn't support base64 images well.
      // We will note it's available locally.
      body += `\n\n### Screenshot
*(Screenshot captured at timestamp. Available in artifacts)*
`;
    }

    if (script) {
      body += `\n\n### Reproduction Script (Playwright)
\`\`\`typescript
${script}
\`\`\`
`;
    }

    try {
      const repo = this.configService.get<string>('GITHUB_REPO', 'MohamedAyman04/gemini-3-hackathon');
      const [owner, name] = repo.split('/');

      const { data: createdIssue } = await this.octokit.rest.issues.create({
        owner,
        repo: name,
        title: title,
        body: body,
        labels: [issue.type, 'vibe-check-auto']
      });

      // If we have a screenshot, maybe we can upload it as a comment? 
      // GitHub API allows uploading assets to Releases, but for Issues it's tricky without third party.
      // We'll skip image upload for now to ensure "clean code" and no complex hacks.

      return createdIssue.html_url;

    } catch (e) {
      console.error("GitHub API Error", e);
      return null;
    }
  }


  // ... Keeping existing handleReproduce logic for backward compatibility
  private async handleReproduce(job: Job): Promise<any> {
    // (Previous implementations of process() logic goes here)
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
    return { status: 'success', filePath, issueUrl };
  }
}
