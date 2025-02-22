import { WebClient, ConversationsListResponse } from '@slack/web-api';

interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  channel: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export class SlackIntegration {
  private client: WebClient;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack token is required');
    }
    this.client = new WebClient(token);
  }

  async getAllChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      }) as ConversationsListResponse;
      
      return (result.channels || []).map(channel => ({
        id: channel.id || '',
        name: channel.name || '',
        is_private: channel.is_private || false
      }));
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  async getChannelMessages(channelId: string, limit = 100): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit
      });
      console.log('Channel messages:', result);
      return (result.messages || []).map(msg => ({
        user: msg.user || '',
        text: msg.text || '',
        ts: msg.ts || '',
        channel: channelId
      }));
    } catch (error) {
      console.error(`Error fetching messages for channel ${channelId}:`, error);
      return [];
    }
  }

  async getUserMessages(userId: string): Promise<SlackMessage[]> {
    const messages: SlackMessage[] = [];
    const channels = await this.getAllChannels();

    for (const channel of channels) {
      const channelMessages = await this.getChannelMessages(channel.id);
      const userMessages = channelMessages.filter(msg => msg.user === userId);
      messages.push(...userMessages);
    }

    return messages;
  }

  async sendMessage(channelId: string, text: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel: channelId,
        text: text
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getDirectMessages(limit = 100): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.list({
        types: 'im'
      }) as ConversationsListResponse;
  
      const allMessages: SlackMessage[] = [];
      for (const channel of result.channels || []) {
        if (channel.id) {
          const messages = await this.getChannelMessages(channel.id, limit);
          allMessages.push(...messages);
        }
      }
  
      return allMessages;
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return [];
    }
  }
}