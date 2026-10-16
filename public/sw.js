// Receives push notifications (even with the site closed) and opens the app when one is tapped.
// Reminders also carry "Voy" / "No voy" buttons that answer without opening the app (Android/desktop).
const ICON = '/apple-icon';

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Blancolores', {
      body: data.body || '',
      icon: ICON,
      badge: ICON,
      tag: data.tag,
      lang: 'es',
      actions: data.matchId && Array.isArray(data.actions) ? data.actions : [],
      data: { url: data.url || '/partido', matchId: data.matchId, confirm: data.confirm },
    }),
  );
});

async function answer(decision, matchId) {
  try {
    const res = await fetch('/api/asistencia', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, matchId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function openApp(url) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      if ('navigate' in client) await client.navigate(url).catch(() => {});
      return client.focus();
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();
  const url = new URL(data.url || '/partido', self.location.origin).href;
  event.waitUntil(
    (async () => {
      if ((event.action === 'going' || event.action === 'not_going') && data.matchId) {
        if (await answer(event.action, data.matchId)) {
          return self.registration.showNotification(notification.title, {
            body: (data.confirm && data.confirm[event.action]) || '',
            icon: ICON,
            badge: ICON,
            tag: notification.tag,
            lang: 'es',
            data: { url: data.url },
          });
        }
      }
      // Tapped the notification itself, or the answer failed (logged out, new week…): open the app.
      return openApp(url);
    })(),
  );
});
