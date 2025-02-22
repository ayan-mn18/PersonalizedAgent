import { tokenStore } from '@/config/token';
import axios from 'axios';

export class JiraIntegration {
  private token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error('Jira token is required');
    }
    this.token = token;
  }

  async getUserTickets(): Promise<any[]> {
    try {
      const response = await axios.get('https:/ayan-mn18.atlassian.net/rest/api/3/search', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        },
        params: {
          jql: 'assignee=currentUser()'
        }
      });
      return response.data.issues;
    } catch (error) {
      console.error('Error fetching Jira tickets:', error);
      return [];
    }
  }

  async getCloudId(): Promise<string | null> {
    try {
      const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      });
      const resources = response.data;
      if (resources && resources.length > 0) {
        const cloudId =  resources[0].id;
        console.log('Cloud ID:', cloudId);
        tokenStore.set('jira_cloud_id', cloudId);
        return cloudId; // Assuming you want the first accessible resource
      }
      return null;
    } catch (error) {
      console.error('Error fetching cloudId:', error);
      return null;
    }
  }

  async getProjectTickets(projectKey: string): Promise<any[]> {
    try {
      const cloudId = tokenStore.get('jira_cloud_id');
      if (!cloudId) {
        console.error('Cloud ID not found');
        return [];
      }
      const response = await axios.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        },
        params: {
          jql: `project=${projectKey}`
        }
      });
      return response.data.issues;
    } catch (error) {
      console.error('Error fetching Jira project tickets:', error);
      return [];
    }
  }

  
}