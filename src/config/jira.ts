export const JIRA_CONFIG = {
  clientId: process.env.JIRA_CLIENT_ID || '',
  clientSecret: process.env.JIRA_CLIENT_SECRET || '',
  redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3003/api/jira/oauth/callback',
  scopes: [ 'manage:jira-project', 'read:jira-user', 'read:jira-work', 'read:issue:jira-software', 'manage:jira-data-provider', 'read:issue:jira', 'read:issue-meta:jira', 'read:issue-link:jira', 'read:issue.property:jira',
  'read:issue-link-type:jira',
  'read:issue.remote-link:jira',
  'read:issue-details:jira',
  'read:issue-type:jira',
  'read:issue-type.property:jira',
  'read:issue-status:jira',
  'read:issue.votes:jira',
  'read:issue-event:jira',
  'read:issue-adjustments:jira',
  'read:epic:jira-software']
};