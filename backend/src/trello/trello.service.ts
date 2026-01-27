import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TrelloService {
  private readonly logger = new Logger(TrelloService.name);

  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl(): string {
    return 'https://api.trello.com/1';
  }

  private getAuthParams(): string {
    const key = this.configService.get<string>('TRELLO_KEY');
    const token = this.configService.get<string>('TRELLO_TOKEN');

    if (!key || !token) {
      this.logger.error('TRELLO_KEY or TRELLO_TOKEN is not defined in .env');
      return '';
    }

    return `key=${key}&token=${token}`;
  }

  async testConnection() {
    const auth = this.getAuthParams();
    if (!auth) return { success: false, error: 'Missing configuration' };

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/members/me/boards?${auth}`,
      );
      return { success: true, boards: response.data };
    } catch (error) {
      this.logger.error(`Trello connection test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.toString(),
      };
    }
  }

  async createCard(name: string, description: string, listId?: string) {
    const auth = this.getAuthParams();
    if (!auth) {
      throw new Error('Trello configuration is missing (key or token)');
    }

    const targetListId =
      listId || this.configService.get<string>('TRELLO_LIST_ID');
    if (!targetListId) {
      // If no list ID provided, try to find one or fail
      this.logger.warn(
        'TRELLO_LIST_ID is not defined. Attempting to find a default list.',
      );
      // For simplicity in the service, we expect a list ID or for it to be in env.
      // The script I wrote earlier handles board/list creation, but the service should be more direct.
      throw new Error('TRELLO_LIST_ID is required to create a card.');
    }

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/cards?idList=${targetListId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(description)}&${auth}`,
      );
      this.logger.log(`Trello card created: ${response.data.id}`);
      return {
        success: true,
        id: response.data.id,
        url: response.data.shortUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to create Trello card: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(
          `Trello API Error: ${JSON.stringify(error.response.data)}`,
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
