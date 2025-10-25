const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

// TODO: Implementar fluxo de autenticação OAuth2
// Por enquanto, usar credenciais salvas
if (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createEvent(summary, description, startDateTime, endDateTime) {
  try {
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    throw error;
  }
}

async function listAvailableSlots(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(8, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(18, 0, 0, 0);

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    throw error;
  }
}

module.exports = {
  calendar,
  oauth2Client,
  createEvent,
  listAvailableSlots
};