const CLIENT_ID = '614504556403-dp7sbc445skbb7jk1pn98cfdb69a13t3.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleLibrary = () => {
  return new Promise<void>((resolve) => {
    // Load GAPI
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
      gapi.load('client', async () => {
        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        
        // Attempt to restore token from localStorage
        const storedToken = localStorage.getItem('google_token');
        if (storedToken) {
          try {
            const token = JSON.parse(storedToken);
            gapi.client.setToken(token);
          } catch (e) {
            console.error('Failed to parse stored Google token', e);
            localStorage.removeItem('google_token');
          }
        }

        gapiInited = true;
        if (gisInited) resolve();
      });
    };
    document.body.appendChild(script1);

    // Load GIS
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
      });
      gisInited = true;
      if (gapiInited) resolve();
    };
    document.body.appendChild(script2);
  });
};

export const signInToGoogle = () => {
  return new Promise<void>((resolve, reject) => {
    try {
      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          reject(resp);
          return;
        }
        localStorage.setItem('google_token', JSON.stringify(resp));
        resolve();
      };

      // If we already have a token, just request a new one silently if possible, 
      // or at least don't force consent if we don't have to.
      const currentToken = gapi.client.getToken();
      tokenClient.requestAccessToken({ prompt: currentToken ? '' : 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
};

export const isGoogleAuthenticated = () => {
  return gapi.client.getToken() !== null;
};

export const syncSessionToCalendar = async (session: {
  subject: string;
  date: string;
  time: string;
  notes?: string;
  student_name?: string;
  google_event_id?: string;
  status?: string;
}) => {
  if (!isGoogleAuthenticated()) {
    console.warn('Not authenticated with Google');
    return null;
  }

  // Combine date and time (Vite/Backend usually provides 'YYYY-MM-DD' and 'HH:mm')
  const startDateTime = `${session.date}T${session.time}:00`;
  const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(); // Default 1 hour

  let summary = `${session.subject} - ${session.student_name || 'Siswa'}`;
  if (session.status === 'cancelled') {
    summary = `[BATAL] ${summary}`;
  }

  const event = {
    summary: summary,
    description: session.notes || '',
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  try {
    let response;
    if (session.google_event_id) {
      response = await (gapi.client as any).calendar.events.update({
        calendarId: 'primary',
        eventId: session.google_event_id,
        resource: event,
      });
    } else {
      response = await (gapi.client as any).calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
    }
    return response.result.id;
  } catch (err) {
    console.error('Error syncing calendar event', err);
    throw err;
  }
};

export const deleteSessionFromCalendar = async (googleEventId: string) => {
  if (!isGoogleAuthenticated()) {
    return;
  }

  try {
    await (gapi.client as any).calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
  } catch (err) {
    console.error('Error deleting calendar event', err);
  }
};
