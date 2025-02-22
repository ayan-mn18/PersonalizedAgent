
// filepath: src/routes/googleCalendar.ts
import { Router } from 'express';
import { google } from 'googleapis';
import { tokenStore } from '@/config/token';

const router = Router();

export const GOOGLE_CALENDAR_CONFIG = {
  clientId: process.env.GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3003/api/google-calendar/oauth/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};

// OAuth initialization endpoint
router.get('/oauth/init', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CALENDAR_CONFIG.clientId,
    GOOGLE_CALENDAR_CONFIG.clientSecret,
    GOOGLE_CALENDAR_CONFIG.redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CALENDAR_CONFIG.scopes,
    prompt: 'consent'
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
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CALENDAR_CONFIG.clientId,
      GOOGLE_CALENDAR_CONFIG.clientSecret,
      GOOGLE_CALENDAR_CONFIG.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code as string);

    if (tokens.access_token) {
      tokenStore.set('google_calendar_token', tokens.access_token);
      res.json({
        success: true,
        token: tokens.access_token,
        message: 'Successfully authenticated with Google Calendar'
      });
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('Google Calendar OAuth error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth process' });
  }
});

// List events endpoint
router.get('/events', async (req, res) => {
  try {
    const token = tokenStore.get('google_calendar_token');
    console.log(token)
    if (!token) {
      res.status(401).json({ error: 'Not authenticated with Google Calendar' });
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CALENDAR_CONFIG.clientId,
      GOOGLE_CALENDAR_CONFIG.clientSecret,
      GOOGLE_CALENDAR_CONFIG.redirectUri
    );
    oauth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    if (!events || events.length === 0) {
      res.json({
        success: true,
        message: 'No upcoming events found.'
      });
      return;
    }

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
});

router.post('/create-events', async (req, res) => {
  try {
    const token = tokenStore.get('google_calendar_token');
    if (!token) {
      res.status(401).json({ error: 'Not authenticated with Google Calendar' });
      return;
    }

    const { summary, description, start, end } = req.body;

    if (!summary || !start || !end) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CALENDAR_CONFIG.clientId,
      GOOGLE_CALENDAR_CONFIG.clientSecret,
      GOOGLE_CALENDAR_CONFIG.redirectUri
    );
    oauth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: start,
        timeZone: 'America/Los_Angeles', // Adjust time zone as needed
      },
      end: {
        dateTime: end,
        timeZone: 'America/Los_Angeles', // Adjust time zone as needed
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    res.status(500).json({ error: 'Failed to create Google Calendar event' });
  }
});

export const googleCalendarRouter = router;