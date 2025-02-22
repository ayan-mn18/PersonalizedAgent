import { Router } from 'express';
import axios from 'axios';
import { JIRA_CONFIG } from '../config/jira';
import { JiraIntegration } from '../jobs/jira';
import dotenv from 'dotenv';
import { tokenStore } from '@/config/token';

const router = Router();

dotenv.config();

// OAuth initialization endpoint
router.get('/oauth/init', (req, res) => {
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${JIRA_CONFIG.clientId}&scope=${JIRA_CONFIG.scopes.join(' ')}&redirect_uri=${JIRA_CONFIG.redirectUri}&response_type=code&prompt=consent`;
  console.log('Auth URL:', authUrl);
  res.redirect(authUrl);
});

// OAuth callback endpoint
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: JIRA_CONFIG.clientId,
      client_secret: JIRA_CONFIG.clientSecret,
      code: code as string,
      redirect_uri: JIRA_CONFIG.redirectUri
    });

    console.log('OAuth response:', response.data);
    if (response.data.access_token) {
      tokenStore.set('jira_token', response.data.access_token);
      
      res.json({
        success: true,
        token: response.data.access_token,
        message: 'Successfully authenticated with Jira'
      });
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('Jira OAuth error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth process' });
  }
});

// Get user tickets endpoint
router.get('/tickets', async (req, res) => {
  try {
    const token = tokenStore.get('jira_token');
    console.log('Jira token:', token);
    if (!token) {
      res.status(401).json({ error: 'Not authenticated with Jira' });
      return;
    }

    const jiraClient = new JiraIntegration(token);
    const tickets = await jiraClient.getUserTickets();

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Error fetching Jira tickets:', error);
    res.status(500).json({ error: 'Failed to fetch Jira tickets' });
  }
});

  // Get project tickets endpoint
  router.post('/get-project-tickets', async (req, res) => {
    try {
      const token = tokenStore.get('jira_token');
      const { projectKey } = req.body;
      console.log('Jira token:', token);
      if (!token) {
        res.status(401).json({ error: 'Not authenticated with Jira' });
        return;
      }
  
      if (!projectKey) {
        res.status(400).json({ error: 'Missing project key' });
        return;
      }
  
      const jiraClient = new JiraIntegration(token);
      await jiraClient.getCloudId();
      const tickets = await jiraClient.getProjectTickets(projectKey as string);
  
      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching Jira project tickets:', error);
      res.status(500).json({ error: 'Failed to fetch Jira project tickets' });
    }
  });

export const jiraRouter = router;