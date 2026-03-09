// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({

  testDir: './tests',

  timeout: 999000,

  fullyParallel: false,   // Run tests sequentially

  workers: 1,             // Only one test at a time

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['line'],
    ['list'],
    ['html'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: false
    }]
  ],

  use: {
    headless: false,       // Open browser UI
    slowMo: 2000,          // Slow execution (2 seconds delay)
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',      // Run real Chrome
        launchOptions: {
          args: ['--start-maximized']
        }
      }
    }
  ]

});