import { test, expect } from '@playwright/test';
import { capturePageEvidence, attachJson } from './support/evidence';

test.describe('FUNCTIONAL — публичная часть LMS SFEDU', () => {
  test('Главная страница открывается и содержит реальные публичные блоки', async ({ page }, testInfo) => {
    await test.step('Открыть LMS', async () => {
      const response = await page.goto('/?lang=en');
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
    });
    await test.step('Проверить публичное содержимое', async () => {
      await expect(page).toHaveTitle(/СЭО ИКТИБ ЮФУ/i);
      await expect(page.getByRole('heading', { name: 'Объявления сайта' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Руководство по LMS' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Новая платформа' })).toBeVisible();
      await expect(page.locator('a[href*="login/index.php"]').first()).toBeVisible();
      await expect(page.locator('body')).toContainText(/You are not logged in|notloggedin/i);
    });
    await capturePageEvidence(page, testInfo, 'home', {
      action: 'Открыта главная страница',
      expected: ['Объявления сайта', 'Руководство по LMS', 'Новая платформа', 'You are not logged in.']
    });
  });

  test('Главная → Вход: рабочая публичная навигация', async ({ page }, testInfo) => {
    await page.goto('/?lang=en');
    await test.step('Нажать Log in на главной', async () => {
      await page.locator('a[href*="login/index.php"]').first().click();
      await expect(page).toHaveURL(/\/login\/index\.php/);
    });
    await test.step('Проверить страницу входа', async () => {
      await expect(page.getByRole('heading', { name: /Log in to Система электронного обучения ИКТИБ ЮФУ/i })).toBeVisible();
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Log in|Вход/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Lost password|Забыли пароль/i })).toBeVisible();
    });
    await capturePageEvidence(page, testInfo, 'login', {
      action: 'Главная → Log in',
      expected: ['Username', 'Password', 'Log in', 'Lost password?']
    });
  });

  test('Вход → Восстановление пароля', async ({ page }, testInfo) => {
    await page.goto('/login/index.php?lang=en');
    await test.step('Перейти по Lost password?', async () => {
      await page.getByRole('link', { name: /Lost password|Забыли пароль/i }).click();
      await expect(page).toHaveURL(/\/login\/forgot_password\.php/);
    });
    await test.step('Проверить две формы поиска пользователя', async () => {
      await expect(page.getByText('Search by username', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Search by email address', { exact: true }).first()).toBeVisible();
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });
    await capturePageEvidence(page, testInfo, 'forgot-password', {
      action: 'Login → Lost password?',
      expected: ['Search by username', 'Search by email address', 'Username', 'Email address']
    });
  });

  test('Каталог курсов: категории и переход в категорию', async ({ page }, testInfo) => {
    await page.goto('/course/index.php?lang=en');
    await test.step('Проверить каталог', async () => {
      await expect(page.getByText('Search courses', { exact: true }).first()).toBeVisible();
      for (const name of ['2024-2025', '2025-2026', 'Промежуточная категория', 'ДПО', 'ГЭК']) {
        await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
      }
    });
    await test.step('Открыть категорию 2025-2026', async () => {
      await page.getByRole('link', { name: '2025-2026', exact: true }).click();
      await expect(page).toHaveURL(/\/course\/index\.php\?categoryid=\d+/);
      await expect(page.getByRole('heading', { name: /Осенний семестр|Весенний семестр/i }).first()).toBeVisible();
    });
    await capturePageEvidence(page, testInfo, 'course-category', {
      action: 'Каталог → 2025-2026',
      expected: ['Осенний семестр', 'Весенний семестр']
    });
  });

  test('Каталог: поиск принимает пользовательский ввод', async ({ page }, testInfo) => {
    await page.goto('/course/index.php?lang=en');
    const search = page.getByRole('textbox', { name: /Search courses/i }).first();
    await expect(search).toBeVisible();
    await search.fill('2025-2026');
    await expect(search).toHaveValue('2025-2026');
    await capturePageEvidence(page, testInfo, 'course-search-input', {
      action: 'Введён запрос 2025-2026 в поле Search courses',
      note: 'Проверяется пользовательский ввод; отправка запроса не требуется для smoke-проверки.'
    });
  });

  test('Пустая форма входа не ломает страницу', async ({ page }, testInfo) => {
    await page.goto('/login/index.php?lang=en');
    await page.getByRole('button', { name: /Log in|Вход/i }).click();
    await expect(page).toHaveURL(/\/login\/index\.php/);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await capturePageEvidence(page, testInfo, 'empty-login', {
      action: 'Нажата Log in без учетных данных',
      expected: 'Страница входа остаётся доступной для повторного ввода'
    });
  });

  test('Публичная навигация: каталог → вход', async ({ page }, testInfo) => {
    await page.goto('/course/index.php?lang=en');
    await page.locator('a[href*="login/index.php"]').first().click();
    await expect(page).toHaveURL(/\/login\/index\.php/);
    await attachJson(testInfo, 'navigation-summary.json', {
      actions: [
        'GET /course/index.php',
        'click Log in',
        'GET /login/index.php'
      ],
      finalUrl: page.url()
    });
    await capturePageEvidence(page, testInfo, 'navigation', {
      action: 'Каталог → Log in'
    });
  });
});
