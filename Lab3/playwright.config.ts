// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./reporters/security-reporter.ts']  // Кастомный репортёр с оценкой рисков
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://lms.sfedu.ru',
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    // Для тестов с множественными запросами
    extraHTTPHeaders: {
      'User-Agent': 'Mozilla/5.0 (compatible; SecurityLab/1.0)'
    }
  },
  projects: [
    {
      name: 'security-chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});