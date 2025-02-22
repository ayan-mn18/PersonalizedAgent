import { Router } from 'express';
import { WebClient } from '@slack/web-api';
import { SlackIntegration } from '../jobs/slack';
import dotenv from 'dotenv';
import { tokenStore } from '@/config/token';

const router = Router();

dotenv.config();

export const SLACK_CONFIG = {
  clientId: process.env.SLACK_CLIENT_ID || '',
  clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3003/api/slack/oauth/callback',
  scopes: [
    'channels:history',
    'channels:read',
    'groups:history',
    'groups:read',
    'users:read',
    'im:history',
    'im:read',
    'mpim:history',
    'mpim:read'
  ],
  userScopes: [
    // 'channels:history', //
    // 'channels:read', //
    // 'groups:history', //
    // 'groups:read', //
    // 'im:history', //
    // 'im:read', //
    // 'mpim:history',  //
    // 'mpim:read', //
    // 'users:read', //
    // 'users:read.email', //
    // 'chat:write',        //
    // 'channels:join',  //
    // 'groups:write',    // 
    // 'im:write',    //
    // 'mpim:write'    //
    "channels:read",
    "chat:write",
    "team:read",
    "users:read",
    "users:read.email",
    "im:history",
    "im:read",
    "im:write",
  ]
};


// OAuth initialization endpoint
router.get('/oauth/init', (req, res) => {
  console.log(SLACK_CONFIG)
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CONFIG.clientId}&user_scope=${SLACK_CONFIG.userScopes.join(',')}&redirect_uri=${SLACK_CONFIG.redirectUri}&access_type=offline&access_prompt=force&token_type=user`;
  console.log(authUrl);
  res.redirect(authUrl);
});

// OAuth callback endpoint
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
     res.status(400).json({ error: 'Missing authorization code' });
     return
  }

  try {
    const client = new WebClient();
    const response = await client.oauth.v2.access({
      client_id: SLACK_CONFIG.clientId,
      client_secret: SLACK_CONFIG.clientSecret,
      code: code as string,
      redirect_uri: SLACK_CONFIG.redirectUri
    });

    console.log('OAuth response:', response);
    // Check for user token
    if (response.authed_user?.access_token) {
      tokenStore.set('slack_token', response.authed_user.access_token);
      
      res.json({
        success: true,
        userToken: response.authed_user.access_token,
        message: 'Successfully authenticated with Slack'
      });
    } else {
      throw new Error('No user access token received');
    }
  } catch (error) {
    console.error('Slack OAuth error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth process' });
  }
});

// Get all messages endpoint
router.get('/messages', async (req, res) => {
  try {
    const token = tokenStore.get('slack_token');
    if (!token) {
       res.status(401).json({ error: 'Not authenticated with Slack' });
       return;
    }

    const slackClient = new SlackIntegration(token);
    const channels = await slackClient.getAllChannels();
    const dms = await slackClient.getDirectMessages();

    console.log('Channels:', channels);
    console.log('DMs:', dms);
    
    // Collect all messages from all channels and DMs
    const allMessages: any[] = [];
    for (const channel of channels) {
      const messages = await slackClient.getChannelMessages(channel.id);
      allMessages.push(...messages.map(msg => ({
        ...msg,
        channelName: channel.name
      })));
    }

    // Add DMs to the allMessages array
    allMessages.push(...dms);

    res.json({
      success: true,
      data: {
        messageCount: allMessages.length,
        messages: allMessages
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message endpoint
router.post('/send-message', async (req, res) => {
  try {
    const slackToken = tokenStore.get('slack_token');
    const { channelId, text } = req.body;
    if (!slackToken || !channelId || !text) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const slackClient = new SlackIntegration(slackToken);
    await slackClient.sendMessage(channelId, text);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export const slackRouter = router;