import { expect, test, type Browser } from '@playwright/test';
import { E2E_ADMIN } from '../../playwright.config';
import { expectNoA11yViolations, login } from './helpers';

// One full journey per project; usernames are suffixed so mobile and desktop runs don't collide.
test.describe.configure({ mode: 'serial' });

const NEW_PASSWORD = 'una contraseña muy larga';

async function newPage(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL, locale: 'es-ES' });
  return context.newPage();
}

test('admin onboarding, answering, guests, enrolling a player and resetting a password', async ({
  page,
  browser,
  baseURL,
}, info) => {
  const suffix = info.project.name.toUpperCase();

  // First login forces password + team; the second project finds the admin already onboarded.
  await login(page, E2E_ADMIN.username, E2E_ADMIN.password);
  const rejected = page.locator('main').getByRole('alert').filter({ hasText: 'incorrectos' });
  const welcome = page.getByRole('heading', { name: /^Bienvenido/ });
  const greeting = page.getByText('Hola, Admin E2E');
  await expect(welcome.or(greeting).or(rejected)).toBeVisible();
  if (await rejected.isVisible()) {
    await login(page, E2E_ADMIN.username, NEW_PASSWORD);
    await expect(welcome.or(greeting)).toBeVisible();
  }
  if (await welcome.isVisible()) {
    await expectNoA11yViolations(page);
    await page.getByLabel('Juego con').selectOption('color');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel('Repite la nueva contraseña').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  }
  await expect(page).toHaveURL(/\/partido$/);
  await expect(page.getByText('Hola, Admin E2E')).toBeVisible();

  // Answer, change, then undo back to the previous answer.
  const status = page.locator('main').getByRole('status').first();
  await page.getByText('DUDA', { exact: true }).click();
  await expect(status).toHaveText('Guardado: DUDA.Deshacer');
  await page.getByText('VOY', { exact: true }).click();
  await expect(status).toHaveText('Guardado: VOY.Deshacer');
  await expect(page.getByRole('region', { name: 'COLOR' }).getByText('Admin E2E')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(status).toHaveText('Guardado: DUDA.');
  await expect(page.getByRole('region', { name: 'DUDOSITOS' }).getByText('Admin E2E')).toBeVisible();
  await page.getByText('NO VOY', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'MARIQUITAS QUE NO VAN' }).getByText('Admin E2E')).toBeVisible();

  // Guests are allowed even when not going.
  const guest = `Íñigo ${suffix.slice(0, 3)}`;
  await page.getByLabel('Nombre del fichaje').fill(guest);
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByRole('region', { name: 'INVITADOS' }).getByText(guest)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: `Quitar a ${guest}` }).click();
  await expect(page.getByRole('region', { name: 'INVITADOS' }).getByText(guest)).toHaveCount(0);

  // Enrol a new player and share the reset link.
  await page.goto('/admin/usuarios');
  await expectNoA11yViolations(page);
  const username = `NUEVO${suffix}`;
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Nombre visible').fill(`Nuevo ${suffix}`);
  await page.getByRole('button', { name: 'Dar de alta' }).click();
  const link = await page.getByLabel(`Enlace para Nuevo ${suffix}`).inputValue();
  expect(link).toMatch(/\/restablecer\/[\w-]{40,}$/);

  // The new player sets a password through the link and picks a team.
  const player = await newPage(browser, baseURL);
  await player.goto(link);
  await expectNoA11yViolations(player);
  await player.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD);
  await player.getByLabel('Repite la nueva contraseña').fill(NEW_PASSWORD);
  await player.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(player).toHaveURL(/\/bienvenida$/);
  await player.getByLabel('Juego con').selectOption('blancos');
  await player.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(player).toHaveURL(/\/partido$/);
  await player.getByText('DUDA', { exact: true }).click();
  await expect(player.getByRole('region', { name: 'DUDOSITOS' }).getByText(`Nuevo ${suffix}`)).toBeVisible();

  // The link is single-use.
  const reuse = await newPage(browser, baseURL);
  await reuse.goto(link);
  await expect(reuse.getByText(/ha caducado o ya se ha usado/)).toBeVisible();

  // Admin marks the player as long-term absent and moves him to Color.
  await page.goto('/admin/usuarios');
  await page.getByRole('link', { name: new RegExp(`Nuevo ${suffix}`) }).click();
  await page.getByLabel('Juego con').selectOption('color');
  await page.getByLabel('Baja de larga duración').check();
  await page.getByLabel('Nota de la baja (solo admins)').fill('Rodilla');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();
  await expectNoA11yViolations(page);

  // Long-term absent players can still answer; their answer wins over the absence group.
  await player.reload();
  await expect(player.getByRole('radio')).toHaveCount(3);
  await expect(player.getByRole('region', { name: 'DUDOSITOS' }).getByText(`Nuevo ${suffix}`)).toBeVisible();

  // Profile: change own team.
  await page.goto('/perfil');
  await expectNoA11yViolations(page);
  await page.getByLabel('Juego con').selectOption('blancos');
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByText('Equipo guardado.')).toBeVisible();
  await page.goto('/partido');
  await page.getByText('VOY', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'BLANCOS' }).getByText('Admin E2E')).toBeVisible();

  // Leave the shared admin as it started for the next project.
  await page.goto('/perfil');
  await page.getByLabel('Juego con').selectOption('color');
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByText('Equipo guardado.')).toBeVisible();
});
