import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers';

test('public page shows the weekly match, the squad groups and the FAQ', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self' 'nonce-");
  expect(response?.headers()['x-powered-by']).toBeUndefined();

  await expect(page.getByRole('heading', { level: 1, name: 'Convocatoria' })).toBeVisible();
  await expect(page.getByText('Polideportivo La Concepción').first()).toBeVisible();
  await expect(page.getByText(/jueves/i).first()).toBeVisible();
  for (const label of ['BLANCOS', 'COLOR', 'INVITADOS', 'DUDOSITOS', 'MARIQUITAS QUE NO VAN']) {
    await expect(page.getByRole('heading', { name: new RegExp(label) })).toBeVisible();
  }

  const faq = page.getByText('He olvidado mi contraseña');
  await faq.click();
  await expect(page.getByText(/Es porque eres un botarate/)).toBeVisible();

  await expectNoA11yViolations(page);
});

test('the venue address opens in a maps app', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /José del Hierro, 5/ });
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=.*Hierro/);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('the match can be added to a calendar', async ({ page }) => {
  await page.goto('/');
  const ics = page.getByRole('link', { name: 'Añadir al calendario' });
  await expect(ics).toHaveAttribute('href', '/api/calendario');
  const response = await page.request.get('/api/calendario');
  expect(response.headers()['content-type']).toContain('text/calendar');
  const body = (await response.text()).replace(/\r\n /g, '');
  expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(body).toContain('LOCATION:Polideportivo La Concepción\\, C. de José del Hierro\\, 5');

  const google = page.getByRole('link', { name: /Google Calendar/ });
  await expect(google).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
});

test('opening one collapsed group does not open or stretch its neighbour', async ({ page }) => {
  await page.goto('/');
  const undecided = page.locator('details', { hasText: 'NO SE HAN DECIDIDO' });
  const absent = page.locator('details', { hasText: 'BAJAS LARGA DURACIÓN' });
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

test('private pages redirect anonymous visitors to login', async ({ page }) => {
  for (const path of ['/partido', '/perfil', '/admin', '/admin/usuarios']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
