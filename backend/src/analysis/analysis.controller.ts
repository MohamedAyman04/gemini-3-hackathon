import { Controller, Post, Body, Get } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';
import { JiraService } from '../jira/jira.service';
import { TrelloService } from '../trello/trello.service';

@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
    private readonly jiraService: JiraService,
    private readonly trelloService: TrelloService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', message: 'Analysis controller is working' };
  }

  @Post('test-jira')
  async testJira(@Body() data: any) {
    try {
      console.log('=== Jira Test Request Started ===');
      const result = await this.jiraService.createIssue(
        data.title || '[Test Issue] Jira Token Verification',
        data.body ||
          'This is a test issue created to verify that the Jira integration is working correctly.',
        data.projectKey,
      );

      if (result.success) {
        console.log('=== Jira Issue Created Successfully ===');
        return {
          success: true,
          issueKey: result.key,
          issueUrl: result.self,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('=== Jira Test Error ===');
      console.error(error);
      return {
        success: false,
        error: error.message,
        details: error.toString(),
      };
    }
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

  @Post('test-github')
  async testGithub(@Body() data: any) {
    try {
      console.log('=== GitHub Test Request Started ===');
      const token = this.configService.get<string>('GITHUB_TOKEN');
      if (!token) {
        throw new Error('GITHUB_TOKEN not found in environment');
      }

      const octokit = new Octokit({ auth: token });
      const repoPath = this.configService.get<string>(
        'GITHUB_REPO',
        'MohamedAyman04/gemini-3-hackathon',
      );
      const [owner, repo] = repoPath.split('/');

      console.log(`Attempting to create issue in ${owner}/${repo}`);

      const { data: issue } = await octokit.rest.issues.create({
        owner,
        repo,
        title: data.title || '[Test Issue] GitHub Token Verification',
        body:
          data.body ||
          'This is a test issue created to verify that the GITHUB_TOKEN is working correctly.',
      });

      console.log('=== GitHub Issue Created Successfully ===');
      return {
        success: true,
        issueUrl: issue.html_url,
        issueNumber: issue.number,
      };
    } catch (error) {
      console.error('=== GitHub Test Error ===');
      console.error(error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.toString(),
      };
    }
  }

  @Post('test-trello')
  async testTrello(@Body() data: any) {
    try {
      console.log('=== Trello Test Request Started ===');
      const result = await this.trelloService.createCard(
        data.title || '[Test Issue] Trello Token Verification',
        data.body ||
          'This is a test card created to verify that the Trello integration is working correctly.',
        data.listId,
      );

      if (result.success) {
        console.log('=== Trello Card Created Successfully ===');
        return {
          success: true,
          cardId: result.id,
          cardUrl: result.url,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('=== Trello Test Error ===');
      console.error(error);
      return {
        success: false,
        error: error.message,
        details: error.toString(),
      };
    }
  }
}
