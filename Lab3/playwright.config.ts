import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./reporters/security-reporter.ts']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://lms.sfedu.ru',
    browserName: 'chromium',
    headless: process.env.HEADED !== '1',
    ignoreHTTPSErrors: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    navigationTimeout: 20_000,
    actionTimeout: 10_000,
    extraHTTPHeaders: {
      'User-Agent': 'VITIS-Playwright-Lab/2.0 (authorized educational security smoke test)'
    }
  },
  projects: [
    {
      name: 'chromium-security',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
