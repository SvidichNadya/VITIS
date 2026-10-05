import { test, expect } from '@playwright/test';
import { capturePageEvidence, attachJson, attachText } from './support/evidence';

test.describe('FUNCTIONAL — публичный пользовательский сценарий LMS', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => {
      test.info().annotations.push({ type: 'functional-js-error', description: error.message });
    });
  });

  test('Главная страница: загрузка, объявления и состояние гостя', async ({ page }, testInfo) => {
    await test.step('Открыть главную страницу', async () => {
      const response = await page.goto('/');
      expect(response?.status()).toBeLessThan(500);
    });
    await test.step('Проверить название и публичное содержимое', async () => {
      await expect(page).toHaveTitle(/СЭО ИКТИБ ЮФУ|Home/i);
      await expect(page.locator('body')).toContainText(/Объявления сайта|Руководство по LMS|Новая платформа/i);
      await expect(page.locator('body')).toContainText(/You are not logged in|Вы не вошли в систему/i);
    });
    await capturePageEvidence(page, testInfo, '01-home', {
      action: 'Открытие главной страницы',
      expected: ['Название LMS', 'Публичные объявления', 'Состояние гостя']
    });
  });

  test('Каталог курсов: категории и поиск', async ({ page }, testInfo) => {
    await test.step('Открыть каталог курсов', async () => {
      const response = await page.goto('/course/index.php');
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toContainText(/Course categories|Курсы|Search courses/i);
    });
    await test.step('Проверить реальные категории каталога', async () => {
      for (const name of ['2024-2025', '2025-2026', 'Промежуточная категория', 'ДПО', 'ГЭК']) {
        await expect(page.getByRole('link', { name })).toBeVisible();
      }
    });
    await capturePageEvidence(page, testInfo, '02-course-catalog', {
      action: 'Открытие каталога и проверка категорий',
      expected: ['2024-2025', '2025-2026', 'Промежуточная категория', 'ДПО', 'ГЭК']
    });

    await test.step('Ввести запрос в поиск курсов', async () => {
      const search = page.locator('input[name="search"], input[placeholder*="Search courses" i]').first();
      await expect(search).toBeVisible();
      await search.fill('2025-2026');
      await expect(search).toHaveValue('2025-2026');
    });
    await test.step('Отправить поиск и проверить результат навигации', async () => {
      const search = page.locator('input[name="search"], input[placeholder*="Search courses" i]').first();
      const form = search.locator('xpath=ancestor::form[1]');
      await form.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toMatch(/\/course\/search\.php/i);
      await expect(page.locator('body')).toContainText(/2025-2026|Search courses|Поиск/i);
    });
    await capturePageEvidence(page, testInfo, '03-course-search', {
      action: 'Поиск курса по существующей категории',
      query: '2025-2026'
    });
  });

  test('Страница входа: классическая форма и вход через @sfedu', async ({ page }, testInfo) => {
    await test.step('Открыть страницу входа', async () => {
      const response = await page.goto('/login/index.php');
      expect(response?.status()).toBeLessThan(500);
      await expect(page).toHaveTitle(/Log in|Вход/i);
    });
    await test.step('Проверить классическую форму авторизации', async () => {
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Log in|Войти/i })).toBeVisible();
    });
    await test.step('Проверить альтернативный вход через @sfedu', async () => {
      await expect(page.locator('body')).toContainText(/Log in using @sfedu account|@sfedu account/i);
      await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
    });
    await test.step('Проверить переход к восстановлению пароля', async () => {
      await expect(page.getByRole('link', { name: /Lost password/i })).toBeVisible();
    });
    await capturePageEvidence(page, testInfo, '04-login', {
      action: 'Проверка страницы авторизации без отправки реальных учетных данных'
    });
  });

  test('Пустая авторизация: сайт показывает валидацию и остается в контексте входа', async ({ page }, testInfo) => {
    await page.goto('/login/index.php');
    await test.step('Нажать Log in без заполнения учетных данных', async () => {
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('Проверить безопасную обработку пустой формы', async () => {
      expect(page.url()).toMatch(/\/login\//i);
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });
    await capturePageEvidence(page, testInfo, '05-empty-login', {
      action: 'Отправка пустой формы авторизации',
      expected: 'Остаться в контексте входа и показать форму повторно'
    });
  });

  test('Восстановление пароля: доступны оба способа поиска пользователя', async ({ page }, testInfo) => {
    await page.goto('/login/forgot_password.php');
    await test.step('Проверить поиск по username', async () => {
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('body')).toContainText(/Search by username|Имя пользователя/i);
    });
    await test.step('Проверить поиск по email', async () => {
      await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
      await expect(page.locator('body')).toContainText(/Search by email address|Адрес электронной почты/i);
    });
    await capturePageEvidence(page, testInfo, '06-forgot-password', {
      action: 'Открытие формы восстановления пароля',
      expected: ['Поиск по username', 'Поиск по email']
    });
  });

  test('Публичный маршрут: переход главная → каталог → вход', async ({ page }, testInfo) => {
    await test.step('Главная', async () => {
      await page.goto('/');
      await expect(page.locator('body')).toContainText(/Moodle|СЭО ИКТИБ ЮФУ/i);
    });
    await test.step('Каталог', async () => {
      await page.goto('/course/index.php');
      await expect(page.locator('body')).toContainText(/2024-2025|2025-2026/i);
    });
    await test.step('Вход', async () => {
      await page.goto('/login/index.php');
      await expect(page.locator('input[name="username"]')).toBeVisible();
    });
    await attachJson(testInfo, '07-navigation-summary.json', {
      actions: [
        { path: '/', result: 'Главная страница открыта' },
        { path: '/course/index.php', result: 'Каталог курсов открыт' },
        { path: '/login/index.php', result: 'Страница входа открыта' }
      ],
      finalUrl: page.url()
    });
    await attachText(testInfo, '07-navigation-log.txt',
      '1. GET / — главная страница\n' +
      '2. GET /course/index.php — каталог курсов\n' +
      '3. GET /login/index.php — страница входа\n' +
      'Все переходы выполнены последовательно без авторизации.'
    );
    await capturePageEvidence(page, testInfo, '07-navigation', {
      action: 'Последовательная публичная навигация'
    });
  });
});
