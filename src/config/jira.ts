export const JIRA_CONFIG = {
  clientId: process.env.JIRA_CLIENT_ID || '',
  clientSecret: process.env.JIRA_CLIENT_SECRET || '',
  redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3003/api/jira/oauth/callback',
  scopes: ['read:issue:jira', 'write:issue:jira', 'manage:jira-project', 'read:jira-user', 'read:jira-work']
};