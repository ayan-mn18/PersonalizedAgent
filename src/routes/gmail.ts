import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { GMAIL_CONFIG, GmailIntegration } from '../jobs/gmail';
import { tokenStore } from '@/config/token';

const router = Router();

// OAuth initialization endpoint
router.get('/oauth/init', (req, res) => {
	const oauth2Client = new OAuth2Client(
		GMAIL_CONFIG.clientId,
		GMAIL_CONFIG.clientSecret,
		GMAIL_CONFIG.redirectUri
	);

	const authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: GMAIL_CONFIG.scopes,
		prompt: 'consent',
	});

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
		const oauth2Client = new OAuth2Client(
			GMAIL_CONFIG.clientId,
			GMAIL_CONFIG.clientSecret,
			GMAIL_CONFIG.redirectUri
		);

		const { tokens } = await oauth2Client.getToken(code as string);

		if (tokens.access_token) {
			tokenStore.set('gmail_token', tokens.access_token);
			res.json({
				success: true,
				token: tokens.access_token,
				message: 'Successfully authenticated with Gmail',
			});
		} else {
			throw new Error('No access token received');
		}
	} catch (error) {
		console.error('Gmail OAuth error:', error);
		res.status(500).json({ error: 'Failed to complete OAuth process' });
	}
});

// Get recent emails endpoint
router.get('/recent-emails', async (req, res) => {
	try {
		const token = tokenStore.get('gmail_token');
		if (!token) {
			res.status(401).json({ error: 'Not authenticated with Gmail' });
			return;
		}

		const gmailClient = new GmailIntegration(token);
		const emails = await gmailClient.getRecentEmails();

		res.json({
			success: true,
			data: emails,
		});
	} catch (error) {
		console.error('Error fetching emails:', error);
		res.status(500).json({ error: 'Failed to fetch emails' });
	}
});

// Send email endpoint
router.post('/send', async (req, res) => {
	try {
		const token = tokenStore.get('gmail_token');
		const { to, subject, message } = req.body;

		if (!token || !to || !subject || !message) {
			res.status(400).json({ error: 'Missing required parameters' });
			return;
		}

		const gmailClient = new GmailIntegration(token);
		await gmailClient.sendEmail(to, subject, message);

		res.json({
			success: true,
			message: 'Email sent successfully',
		});
	} catch (error) {
		console.error('Error sending email:', error);
		res.status(500).json({ error: 'Failed to send email' });
	}
});

// Reply to email endpoint
router.post('/reply', async (req, res) => {
	try {
		const token = tokenStore.get('gmail_token');
		const { messageId, replyText } = req.body;

		if (!token || !messageId || !replyText) {
			res.status(400).json({ error: 'Missing required parameters' });
			return;
		}

		const gmailClient = new GmailIntegration(token);
		await gmailClient.replyToEmail(messageId, replyText);

		res.json({
			success: true,
			message: 'Reply sent successfully',
		});
	} catch (error) {
		console.error('Error sending reply:', error);
		res.status(500).json({ error: 'Failed to send reply' });
	}
});

export const gmailRouter = router;
