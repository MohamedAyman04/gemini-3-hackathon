import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'TEST';

async function createTestIssue() {
  if (!JIRA_EMAIL || !JIRA_TOKEN || !JIRA_DOMAIN) {
    console.error('Missing Jira configuration in .env');
    console.log('Required: JIRA_EMAIL, JIRA_TOKEN, JIRA_DOMAIN');
    return;
  }

  const baseUrl = `https://${JIRA_DOMAIN}.atlassian.net/rest/api/3`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
  const authHeader = `Basic ${auth}`;

  const payload = {
    fields: {
      project: {
        key: JIRA_PROJECT_KEY,
      },
      summary: 'Test Issue Created from Script',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a test issue created to verify the Jira integration.',
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
    console.log(`Creating issue in project: ${JIRA_PROJECT_KEY}...`);
    const response = await axios.post(`${baseUrl}/issue`, payload, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('Jira issue created successfully!');
    console.log(`Issue Key: ${response.data.key}`);
    console.log(
      `Issue URL: https://${JIRA_DOMAIN}.atlassian.net/browse/${response.data.key}`,
    );
  } catch (error: any) {
    console.error('Failed to create Jira issue:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

createTestIssue();
