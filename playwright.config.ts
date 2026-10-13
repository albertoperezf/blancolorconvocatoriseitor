import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
export const E2E_ADMIN = { username: 'E2EADMIN', password: 'e2e-temporary-password' };

// Set PW_CHANNEL=chrome to reuse a locally installed Chrome when the Playwright browser download isn't possible.
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel } },
  ],
  webServer: {
    // In-memory PGlite exposed as Postgres, seeded with a known admin, serving the production build.
    command: `pglite-server --db=memory:// --port=54330 --include-database-url --run="npm run e2e:serve"`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DB_POOL_MAX: '1',
      PORT: String(PORT),
      APP_URL: `http://localhost:${PORT}`,
      ADMIN_USERNAME: E2E_ADMIN.username,
      ADMIN_DISPLAY_NAME: 'Admin E2E',
      ADMIN_TEMP_PASSWORD: E2E_ADMIN.password,
      // The seeded past matches predate the real start date (15 Oct 2026).
      RESULTS_FROM: '2000-01-01T00:00:00Z',
    },
  },
});
