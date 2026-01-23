import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private readonly configService: ConfigService) {}

  private getAuthHeader(): string {
    const email = this.configService.get<string>('JIRA_EMAIL');
    const token = this.configService.get<string>('JIRA_TOKEN');

    if (!email || !token) {
      this.logger.error('JIRA_EMAIL or JIRA_TOKEN is not defined in .env');
      return '';
    }

    const auth = Buffer.from(`${email}:${token}`).toString('base64');
    return `Basic ${auth}`;
  }

  private getBaseUrl(): string {
    const domain = this.configService.get<string>('JIRA_DOMAIN');
    if (!domain) {
      this.logger.error('JIRA_DOMAIN is not defined in .env');
      return '';
    }
    return `https://${domain}.atlassian.net/rest/api/3`;
  }

  async testConnection() {
    const baseUrl = this.getBaseUrl();
    const authHeader = this.getAuthHeader();

    if (!baseUrl || !authHeader)
      return { success: false, error: 'Missing configuration' };

    try {
      const response = await axios.get(`${baseUrl}/project`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(`Jira connection test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.toString(),
      };
    }
  }

  async createIssue(summary: string, description: string, projectKey?: string) {
    const baseUrl = this.getBaseUrl();
    const authHeader = this.getAuthHeader();
    const key =
      projectKey || this.configService.get<string>('JIRA_PROJECT_KEY', 'TEST');

    if (!baseUrl || !authHeader) {
      throw new Error(
        'Jira configuration is missing (email, token, or domain)',
      );
    }

    const payload = {
      fields: {
        project: {
          key: key,
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: {
          name: 'Bug',
        },
      },
    };

    try {
      const response = await axios.post(`${baseUrl}/issue`, payload, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      this.logger.log(`Jira issue created: ${response.data.key}`);
      return {
        success: true,
        key: response.data.key,
        self: response.data.self,
      };
    } catch (error) {
      this.logger.error(`Failed to create Jira issue: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(
          `Jira API Error: ${JSON.stringify(error.response.data)}`,
        );
      }
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.toString(),
      };
    }
  }
}
