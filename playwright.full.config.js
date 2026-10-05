const { defineConfig } = require('@playwright/test');
const { API_PORT, UI_PORT } = require('./e2e/full/settings');

// UI-driven tests against the REAL backend and a fresh database: every step is done through the
// screens (sign in, click, type), nothing is faked.
//   npm run build:ui-tests && npm run ui-tests
module.exports = defineConfig({
  testDir: './e2e/full',
  testMatch: '**/*.spec.js',
  workers: 1,               // one shared database, so the story runs in order
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${UI_PORT}`,
    viewport: { width: 1366, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: [
    { command: 'node e2e/full/start-backend.js', url: `http://127.0.0.1:${API_PORT}/`, reuseExistingServer: false, timeout: 60000 },
    { command: `node e2e/serve.js build-full ${UI_PORT}`, url: `http://127.0.0.1:${UI_PORT}`, reuseExistingServer: false },
  ],
});
