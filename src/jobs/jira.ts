import { tokenStore } from '@/config/token';
import axios from 'axios';

interface JiraBranch {
  name: string;
  url?: string;
  issueKey: string;
}

interface JiraPullRequest {
  id: number;
  name: string;
  url: string;
  status: string;
  issueKey: string;
}

interface SanitizedJiraIssue {
  key: string;
  summary: string;
  status: {
    name: string;
    category: string;
  };
  description: string | null;
}

interface JiraResponseSanitizer {
  sanitizeJiraResponse(issues: any[]): SanitizedJiraIssue[];
  sanitizeSingleIssue(issue: any): SanitizedJiraIssue;
}

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

  // Updated getProjectTickets function with sanitization
async getProjectTickets(projectKey: string): Promise<SanitizedJiraIssue[]> {
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

    return response.data.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: {
        name: issue.fields.status.name,
        category: issue.fields.status.statusCategory.name
      },
      description: issue.fields.description
    }));
  } catch (error) {
    console.error('Error fetching Jira project tickets:', error);
    return [];
  }
}

  async getTicketDetails(issueKey: string): Promise<any> {
    try {
      const cloudId = tokenStore.get('jira_cloud_id');
      if (!cloudId) {
        console.error('Cloud ID not found');
        return null;
      }
      
      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/dev-status/latest/issue/detail?issueId=${issueKey}&applicationType=GitHub&dataType=branch`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
          },
          params: {
            expand: 'renderedFields,names,schema,transitions,operations,editmeta,changelog'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for ticket ${issueKey}:`, error);
      return null;
    }
  }


  async getProjectTicketsWithDevInfo(projectKey: string): Promise<any[]> {
    try {
      const tickets = await this.getProjectTickets(projectKey);
      
      // Fetch development information for each ticket
      const ticketsWithDevInfo = await Promise.all(
        tickets.map(async (ticket) => {
          const devInfo = await this.getDevInfo(ticket.key);
          return {
            ...ticket,
            development: {
              branches: devInfo.branches,
              pullRequests: devInfo.pullRequests
            }
          };
        })
      );

      return ticketsWithDevInfo;
    } catch (error) {
      console.error('Error fetching tickets with development info:', error);
      return [];
    }
  }

  async getDevInfo(issueKey: string): Promise<{branches: JiraBranch[], pullRequests: JiraPullRequest[]}> {
    try {
      const cloudId = tokenStore.get('jira_cloud_id');
      if (!cloudId) {
        console.error('Cloud ID not found');
        return { branches: [], pullRequests: [] };
      }

      const response = await axios.get(
       `https://api.atlassian.com/ex/jira/${cloudId}/rest/dev-status/latest/issue/detail?issueId=${issueKey}?dataType=branch`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
          }
        }
      );

      const devDetails = response.data?.detail?.[0]?.branches || [];
      const prDetails = response.data?.detail?.[0]?.pullRequests || [];

      return {
        branches: devDetails.map((branch: any) => ({
          name: branch.name,
          url: branch.url,
          issueKey: issueKey
        })),
        pullRequests: prDetails.map((pr: any) => ({
          id: pr.id,
          name: pr.name,
          url: pr.url,
          status: pr.status,
          issueKey: issueKey
        }))
      };
    } catch (error) {
      console.error('Error fetching development information:', error);
      return { branches: [], pullRequests: [] };
    }
  }

  
}

export class JiraDataSanitizer implements JiraResponseSanitizer {
  sanitizeJiraResponse(issues: any[]): SanitizedJiraIssue[] {
    if (!Array.isArray(issues)) {
      console.warn('Invalid input: Expected an array of issues');
      return [];
    }
    
    return issues.map(issue => this.sanitizeSingleIssue(issue));
  }

  sanitizeSingleIssue(issue: any): SanitizedJiraIssue {
    try {
      const description = issue.fields.description?.type === 'doc' 
        ? this.extractTextFromDescription(issue.fields.description)
        : issue.fields.description;

      return {
        key: issue.key,
        summary: issue.fields.summary,
        status: {
          name: issue.fields.status.name,
          category: issue.fields.status.statusCategory.name
        },
        description: description
      };
    } catch (error) {
      console.error(`Error sanitizing issue ${issue?.key}:`, error);
      return {
        key: issue?.key || 'unknown',
        summary: 'Error processing issue',
        status: {
          name: 'Unknown',
          category: 'Unknown'
        },
        description: null
      };
    }
  }

  private extractTextFromDescription(description: any): string {
    if (!description?.content) return '';
    
    return description.content
      .map((block: any) => {
        if (block.type === 'paragraph' && block.content) {
          return block.content
            .map((content: any) => content.text || '')
            .join(' ');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
}