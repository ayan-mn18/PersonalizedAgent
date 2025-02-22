

export const SLACK_CONFIG = {
  clientId: process.env.SLACK_CLIENT_ID || '',
  clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3003/api/slack/oauth/callback',
  scopes: [
    'channels:history',
    'channels:read',
    'groups:history',
    'groups:read',
    'users:read'
  ]
};