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
    const newPassword = page.getByLabel('Nueva contraseña', { exact: true });
    const showNew = page.getByLabel('Mostrar contraseña').first();
    await page.getByLabel('Juego con').selectOption('color');
    await newPassword.fill(NEW_PASSWORD);
    await showNew.check();
    await page.getByLabel('Repite la nueva contraseña').fill('no es la misma');
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    // A mismatch keeps what was typed and the show-password state.
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    await expect(newPassword).toHaveValue(NEW_PASSWORD);
    await expect(newPassword).toHaveAttribute('type', 'text');
    await expect(showNew).toBeChecked();
    await expect(page.getByLabel('Juego con')).toHaveValue('color');

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
  await expect(page.getByRole('region', { name: 'COLOR' }).getByText('(tú)')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(status).toHaveText('Guardado: DUDA.');
  await expect(page.getByRole('region', { name: 'DUDOSITOS' }).getByText('Admin E2E')).toBeVisible();
  await page.getByText('NO VOY', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'MARIQUITAS QUE NO VAN' }).getByText('Admin E2E')).toBeVisible();

  // Guests are allowed even when not going.
  const guest = `Íñigo ${suffix.slice(0, 3)}`;
  await page.getByLabel('Nombre del fichaje').fill(guest);
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
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

  // The player changes his password: a mismatch keeps the values, success clears and hides them.
  await player.goto('/perfil');
  // Joined after the seeded past matches, so nothing is counted for him yet.
  await expect(player.getByRole('region', { name: 'Mis partidos' })).toContainText(
    'Todavía no tienes partidos contados',
  );
  const current = player.getByLabel('Contraseña actual');
  const next = player.getByLabel('Nueva contraseña', { exact: true });
  const confirm = player.getByLabel('Repite la nueva contraseña');
  const showNext = player.getByLabel('Mostrar contraseña').nth(1);
  await current.fill(NEW_PASSWORD);
  await next.fill('otra contraseña larga');
  await confirm.fill('otra contraseña distinta');
  await showNext.check();
  await player.getByRole('region', { name: 'Cambiar contraseña' }).getByRole('button', { name: 'Guardar' }).click();
  await expect(player.getByText('Las contraseñas no coinciden.')).toBeVisible();
  await expect(current).toHaveValue(NEW_PASSWORD);
  await expect(next).toHaveValue('otra contraseña larga');
  await expect(showNext).toBeChecked();
  await expect(next).toHaveAttribute('type', 'text');

  await confirm.fill('otra contraseña larga');
  await player.getByRole('region', { name: 'Cambiar contraseña' }).getByRole('button', { name: 'Guardar' }).click();
  await expect(player.getByText(/Contraseña cambiada/)).toBeVisible();
  await expect(next).toHaveValue('');
  await expect(showNext).not.toBeChecked();
  await expect(next).toHaveAttribute('type', 'password');

  // Position: chosen in the profile, shown with its icon next to the name in every squad group.
  const positionSection = player.getByRole('region', { name: 'Mi posición' });
  await positionSection.getByText('Portero', { exact: true }).click();
  await expect(player.getByRole('radio', { name: 'Portero' })).toBeChecked();
  await player.getByRole('region', { name: 'Mi posición' }).getByRole('button', { name: 'Guardar' }).click();
  await expect(player.getByText('Posición guardada.')).toBeVisible();
  await expectNoA11yViolations(player);
  await player.goto('/');
  await expect(
    player
      .getByRole('region', { name: 'DUDOSITOS' })
      .getByRole('listitem')
      .filter({ hasText: `Nuevo ${suffix}` }),
  ).toContainText(`Nuevo ${suffix} (tú), Portero`);

  // Hovering the icon shows the position; the home CTA reflects the player's answer.
  const chip = player
    .getByRole('region', { name: 'DUDOSITOS' })
    .getByRole('listitem')
    .filter({ hasText: `Nuevo ${suffix}` });
  const icon = chip.locator('.cursor-help');
  if (info.project.name === 'mobile') await icon.tap();
  else await icon.hover();
  await expect(chip.getByText('Portero', { exact: true })).toBeVisible();
  await expect(player.getByText('Tu respuesta: DUDA')).toBeVisible();
  await expect(player.getByRole('link', { name: 'Cambiar mi respuesta' })).toBeVisible();
  await player.getByRole('link', { name: 'Cambiar mi respuesta' }).click();
  await expect(player.getByRole('link', { name: 'Mi partido' })).toHaveAttribute('aria-current', 'page');

  // Profile: change own team.
  await page.goto('/perfil');
  await expectNoA11yViolations(page);
  await page.getByLabel('Juego con').selectOption('blancos');
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByText('Equipo guardado.')).toBeVisible();
  await page.goto('/partido');
  await page.getByText('VOY', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'BLANCOS' }).getByText('Admin E2E')).toBeVisible();

  // Forgot password: the player asks from the login page, an admin sees it and generates the link.
  const forgetful = await newPage(browser, baseURL);
  await forgetful.goto('/login');
  await forgetful.getByRole('link', { name: '¿Has olvidado tu contraseña?' }).click();
  await expect(forgetful).toHaveURL(/\/recuperar$/);
  await expectNoA11yViolations(forgetful);
  await forgetful.getByLabel('Usuario').fill(`nuevo${suffix.toLowerCase()}`);
  await forgetful.getByRole('button', { name: 'Avisar a los admins' }).click();
  await expect(forgetful.getByText(/los admins ya lo saben/)).toBeVisible();

  await page.goto('/partido');
  await page.getByRole('link', { name: /Admin.*solicitud/ }).click();
  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  const requests = page.getByRole('region', { name: /olvidado su contraseña/ });
  await expect(requests.getByText(`Nuevo ${suffix}`)).toBeVisible();
  await expectNoA11yViolations(page);
  await requests.getByRole('button', { name: 'Generar enlace' }).click();
  await expect(requests.getByLabel(`Enlace para Nuevo ${suffix}`)).toHaveValue(/\/restablecer\//);
  await page.reload();
  await expect(page.getByRole('region', { name: /olvidado su contraseña/ })).toHaveCount(0);

  // Results: admins record and correct scores; the winner is derived; players only read them.
  await page.getByRole('link', { name: 'Resultados' }).click();
  await expect(page).toHaveURL(/\/resultados$/);
  const latest = page.locator('main li').first();
  await latest.getByLabel('Goles de Blancos').fill('3');
  await latest.getByLabel('Goles de Color').fill('');
  await latest.getByRole('button', { name: 'Guardar' }).click();
  await expect(latest.getByText('Pon los goles de este equipo.')).toBeVisible();
  await expect(latest.getByLabel('Goles de Blancos')).toHaveValue('3');

  await latest.getByLabel('Goles de Color').fill('1');
  await latest.getByRole('button', { name: 'Guardar' }).click();
  await expect(latest.getByRole('status')).toHaveText('Resultado guardado.');
  await expect(latest).toContainText('Resultado: Blancos');
  await expect(latest).toContainText('3 – 1');

  await latest.getByLabel('Goles de Blancos').fill('2');
  await latest.getByLabel('Goles de Color').fill('2');
  await latest.getByRole('button', { name: 'Guardar' }).click();
  await expect(latest).toContainText('Resultado: Empate');
  await expect(latest).toContainText('2 – 2');
  await expect(page.getByRole('region', { name: /^Temporada/ })).toContainText('Empates');
  await expectNoA11yViolations(page);

  await player.goto('/resultados');
  await expect(player.locator('main li').first()).toContainText('Resultado: Empate');
  await expect(player.getByRole('button', { name: 'Guardar' })).toHaveCount(0);
  await expectNoA11yViolations(player);

  // Attendance: admins see every player's numbers, sortable by column; players can't open it.
  await page.goto('/admin');
  await page.getByRole('link', { name: /Asistencia/ }).click();
  await expect(page).toHaveURL(/\/admin\/asistencia$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Asistencia' })).toBeVisible();
  await expect(page.locator('main')).toContainText(/Datos desde el \d+ de \w+ de \d{4}, según lo que respondió/);
  const table = page.getByRole('region', { name: 'Asistencia por jugador' });
  await expect(table.getByRole('rowheader', { name: 'Admin E2E' })).toBeVisible();
  const went = table.getByRole('columnheader', { name: /He ido/ });
  const maybe = table.getByRole('columnheader', { name: /Dudoso/ });
  await expect(went).toHaveAttribute('aria-sort', 'descending');
  await went.getByRole('link').click();
  await expect(page).toHaveURL(/orden=went&dir=asc/);
  await expect(went).toHaveAttribute('aria-sort', 'ascending');
  await maybe.getByRole('link').click();
  await expect(maybe).toHaveAttribute('aria-sort', 'descending');
  await expect(went).not.toHaveAttribute('aria-sort');
  await maybe.getByRole('link').click();
  await expect(maybe).toHaveAttribute('aria-sort', 'ascending');
  await expectNoA11yViolations(page);
  await player.goto('/admin/asistencia');
  await expect(player).toHaveURL(/\/partido$/);

  // Leave the shared admin as it started for the next project.
  await page.goto('/perfil');
  await page.getByLabel('Juego con').selectOption('color');
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByText('Equipo guardado.')).toBeVisible();
});
