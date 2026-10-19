import { expect, test } from '@playwright/test';
import { E2E_CRON_SECRET } from '../../playwright.config';
import { expectNoA11yViolations } from './helpers';

test('public page shows the weekly match, the squad groups and a contact link', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self' 'nonce-");
  expect(response?.headers()['x-powered-by']).toBeUndefined();

  await expect(page.getByRole('heading', { level: 1, name: 'Convocatoria' })).toBeVisible();
  await expect(page.getByText('Polideportivo La Concepción').first()).toBeVisible();
  await expect(page.getByText(/jueves/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apúntate al partido' })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Resultados' })).not.toHaveAttribute('aria-current');
  for (const label of ['BLANCOS', 'COLOR', 'INVITADOS', 'DUDOSITOS', 'MARIQUITAS QUE NO VAN']) {
    await expect(page.getByRole('heading', { name: new RegExp(label) })).toBeVisible();
  }

  await expect(page.getByRole('heading', { name: 'Preguntas frecuentes' })).toHaveCount(0);
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Contacto' })).toHaveAttribute(
    'href',
    '/contacto',
  );

  await expectNoA11yViolations(page);
});

test('visitors can send a message from the contact form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contacto' }).click();
  await expect(page).toHaveURL(/\/contacto$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Contacto' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('@gmail.com');

  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('Escribe tu nombre (entre 2 y 60 caracteres).')).toBeVisible();
  await expect(page.getByText('Escribe un email válido.')).toBeVisible();
  await expect(page.getByText('Escribe un mensaje de entre 10 y 1000 caracteres.')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel('Nombre').fill('Visitante');
  await page.getByLabel('Email').fill('visitante@example.com');
  await page.getByLabel('Mensaje').fill('Hola, ¿puedo jugar algún jueves?');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByRole('status')).toContainText('¡Gracias! Te responderé lo antes posible.');
  await expect(page.getByLabel('Mensaje')).toHaveValue('');
});

test('the venue name opens in a maps app', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /^Polideportivo La Concepción/ });
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=.*Hierro/);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('main')).not.toContainText('José del Hierro');
});

test('the match can be added to a calendar from a small menu', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Añadir a calendario' });
  const ics = page.getByRole('link', { name: 'Apple / Outlook (.ics)' });
  await expect(ics).toBeHidden();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(ics).toHaveAttribute('href', '/api/calendario');
  const google = page.getByRole('link', { name: /Google Calendar/ });
  await expect(google).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  await expectNoA11yViolations(page);

  await page.keyboard.press('Escape');
  await expect(ics).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(ics).toBeHidden();

  const response = await page.request.get('/api/calendario');
  expect(response.headers()['content-type']).toContain('text/calendar');
  const body = (await response.text()).replace(/\r\n /g, '');
  expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(body).toContain('LOCATION:Polideportivo La Concepción\\, C. de José del Hierro\\, 5');
});

test('the match can be shared with a ready-made message', async ({ page }) => {
  await page.goto('/');
  const share = page.getByRole('link', { name: 'Compartir' });
  const href = (await share.getAttribute('href'))!;
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  const text = new URL(href).searchParams.get('text')!;
  expect(text).toContain('Polideportivo La Concepción');
  expect(text).toMatch(/Van \d+/);
});

test('the squad shows how old the data is after 10 s and can be refreshed by hand', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const refresh = page.getByRole('button', { name: 'Actualizar' });
  await expect(refresh).toBeVisible();
  await expect(page.getByText(/^Actualizado/)).toHaveCount(0);
  await page.clock.fastForward(20_000);
  await expect(page.getByText(/^Actualizado hace \d+s$/)).toBeVisible();
  await refresh.click();
  await expect(page.getByText(/^Actualizado/)).toHaveCount(0);
});

test('opening one collapsed group does not open or stretch its neighbour', async ({ page }) => {
  await page.goto('/');
  const undecided = page.locator('details', { hasText: 'NO SE HAN DECIDIDO' });
  const absent = page.locator('details', { hasText: 'BAJAS LARGA DURACIÓN' });
  // The page streams in behind the loading skeleton; measure once it is shown.
  await expect(absent).toBeVisible();
  const closedHeight = (await absent.boundingBox())!.height;
  await undecided.locator('summary').click();
  await expect(undecided).toHaveAttribute('open', '');
  await expect(absent).not.toHaveAttribute('open');
  expect((await absent.boundingBox())!.height).toBe(closedHeight);
});

test('the theme toggle switches light/dark and remembers the choice', async ({ page }) => {
  // Reduced motion skips the button colour transition so axe sees the final colours.
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Tema oscuro' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const lightBg = await bodyBg();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The reduced-motion rule leaves a 0.01 ms transition, so poll for the settled colour.
  await expect.poll(bodyBg).not.toBe(lightBg);
  const darkBg = await bodyBg();
  await expectNoA11yViolations(page);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Tema oscuro' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(bodyBg).toBe(darkBg);

  await page.getByRole('button', { name: 'Tema oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(bodyBg).toBe(lightBg);
});

test('login rejects bad credentials without revealing whether the user exists', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill('NOEXISTE');
  await page.getByLabel('Contraseña', { exact: true }).fill('whatever');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.');
  await expect(page.getByLabel('Usuario')).toHaveValue('NOEXISTE');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeFocused();
  await expectNoA11yViolations(page);
});

test('public pages are indexable, private ones are not, and robots/sitemap/OG image exist', async ({ page }) => {
  for (const path of ['/', '/resultados']) {
    const response = await page.goto(path);
    expect(response?.headers()['x-robots-tag']).toBeUndefined();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`^https?://[^/]+${path === '/' ? '/?' : path}$`),
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
  }
  for (const path of ['/login', '/recuperar']) {
    const response = await page.goto(path);
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  }
  const robots = await (await page.request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /api/');
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/resultados</loc>');
  const og = await page.request.get('/opengraph-image');
  expect(og.headers()['content-type']).toBe('image/png');

  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/icon\.svg/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /\/apple-icon/);
  expect((await page.request.get('/favicon.ico')).status()).toBe(404);
});

test('the reminder job only runs for Vercel Cron and the service worker is served', async ({ request }) => {
  expect((await request.get('/api/cron/recordatorio')).status()).toBe(401);
  expect((await request.get('/api/cron/recordatorio', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(
    401,
  );
  const ok = await request.get('/api/cron/recordatorio', { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual(expect.any(Object));

  const sw = await request.get('/sw.js');
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("addEventListener('push'");

  // Answering from a notification needs the app's own origin and a session.
  const data = { decision: 'going', matchId: '00000000-0000-4000-8000-000000000000' };
  expect((await request.post('/api/asistencia', { data })).status()).toBe(403);
  const origin = new URL(test.info().project.use.baseURL!).origin;
  expect((await request.post('/api/asistencia', { data, headers: { origin } })).status()).toBe(401);
});

test('private pages redirect anonymous visitors to login', async ({ page }) => {
  for (const path of ['/partido', '/perfil', '/admin', '/admin/usuarios', '/admin/asistencia', '/admin/mensajes']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
