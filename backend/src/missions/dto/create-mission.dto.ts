export class CreateMissionDto {
  name: string;
  url: string;
  context: string;
  happyPath?: any;
  githubToken?: string;
  jiraToken?: string;
  trelloToken?: string;
  integrationType?: 'none' | 'jira' | 'trello';
}
