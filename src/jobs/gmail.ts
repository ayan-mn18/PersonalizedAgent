import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const GMAIL_CONFIG = {
	clientId: process.env.GMAIL_CLIENT_ID || '',
	clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
	redirectUri:
		process.env.GMAIL_REDIRECT_URI ||
		'http://localhost:3003/api/gmail/oauth/callback',
	scopes: [
		'https://www.googleapis.com/auth/gmail.readonly',
		'https://www.googleapis.com/auth/gmail.send',
		'https://www.googleapis.com/auth/gmail.modify',
	],
};

export class GmailIntegration {
	private oauth2Client: OAuth2Client;

	constructor(token: string) {
		if (!token) {
			throw new Error('Gmail token is required');
		}

		this.oauth2Client = new OAuth2Client(
			GMAIL_CONFIG.clientId,
			GMAIL_CONFIG.clientSecret,
			GMAIL_CONFIG.redirectUri
		);
		this.oauth2Client.setCredentials({ access_token: token });
	}

	async getRecentEmails(): Promise<any[]> {
		try {
			const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			const response = await gmail.users.messages.list({
				userId: 'me',
				q: `after:${yesterday.getTime() / 1000}`,
			});

			const emails = [];
			for (const message of response.data.messages || []) {
				const email = await gmail.users.messages.get({
					userId: 'me',
					id: message.id!,
				});
				emails.push(email.data);
			}

			return emails;
		} catch (error) {
			console.error('Error fetching emails:', error);
			return [];
		}
	}

	async sendEmail(to: string, subject: string, message: string): Promise<void> {
		try {
			const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
			const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
			const messageParts = [
				`To: ${to}`,
				'Content-Type: text/html; charset=utf-8',
				'MIME-Version: 1.0',
				`Subject: ${utf8Subject}`,
				'',
				message,
			];
			const email = messageParts.join('\n');
			const encodedMessage = Buffer.from(email)
				.toString('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');

			await gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: encodedMessage,
				},
			});
		} catch (error) {
			console.error('Error sending email:', error);
			throw error;
		}
	}

	async replyToEmail(messageId: string, replyText: string): Promise<void> {
		try {
			const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

			// Get the original message
			const originalMessage = await gmail.users.messages.get({
				userId: 'me',
				id: messageId,
			});

			const headers = originalMessage.data.payload?.headers;
			const subject = headers?.find((h) => h.name === 'Subject')?.value || '';
			const references =
				headers?.find((h) => h.name === 'Message-ID')?.value || '';
			const to = headers?.find((h) => h.name === 'From')?.value || '';

			const messageParts = [
				`To: ${to}`,
				'Content-Type: text/html; charset=utf-8',
				'MIME-Version: 1.0',
				`Subject: Re: ${subject}`,
				`References: ${references}`,
				`In-Reply-To: ${references}`,
				'',
				replyText,
			];

			const email = messageParts.join('\n');
			const encodedMessage = Buffer.from(email)
				.toString('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');

			await gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: encodedMessage,
					threadId: originalMessage.data.threadId,
				},
			});
		} catch (error) {
			console.error('Error replying to email:', error);
			throw error;
		}
	}
}
