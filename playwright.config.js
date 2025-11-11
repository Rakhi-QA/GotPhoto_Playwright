// playwright.config.js

import { defineConfig } from '@playwright/test';

export default defineConfig({
   testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 999000,

    reporter: [
      ['list'], // console reporter
      ['html'], // Playwright default HTML report
      ['allure-playwright'] // Allure report
    ],
    

  use: {
    trace: 'on-first-retry',
    headless: false, // Run in headed mode
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
      },
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
