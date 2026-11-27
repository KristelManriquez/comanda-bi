import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de sistema (extremo a extremo) con Playwright.
 * Levantan el servidor con la base de PRUEBAS (TEST_DATABASE_URL en server/.env.test)
 * y el front apuntando a ese servidor. Nunca usan la base de producción.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-reporte' }]],
  use: {
    baseURL: 'http://localhost:5180',
    locale: 'es-CL',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node test/e2e-servidor.js',
      cwd: '../server',
      url: 'http://localhost:4100/api/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npx vite --port 5180 --strictPort',
      url: 'http://localhost:5180',
      env: { VITE_API_URL: 'http://localhost:4100/api' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
