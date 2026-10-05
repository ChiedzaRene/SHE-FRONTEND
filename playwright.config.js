const { defineConfig } = require('@playwright/test');

// Browser tests run against the production build with the API mocked (see e2e/helpers.js),
// so they need no backend or database:
//   npm run build:e2e && npm run e2e
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  testIgnore: '**/full/**', // the real-backend UI tests have their own config (playwright.full.config.js)
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'node e2e/serve.js', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
