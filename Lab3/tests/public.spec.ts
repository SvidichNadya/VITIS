import { test, expect } from '@playwright/test';

test.describe('LMS — публичная функциональность', () => {
  test('Главная страница открывается и содержит признаки LMS', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/СЭО ИКТИБ ЮФУ|Home/i);
    await expect(page.locator('body')).toContainText(/Moodle|Вход|Log in/i);
  });

  test('Гостю показывается состояние «не авторизован»', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/Вы не вошли в систему|You are not logged in|Вход|Log in/i);
  });

  test('Каталог курсов доступен и не вызывает JS-ошибок', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/course/index.php');
    await expect(page.locator('body')).toContainText(/Курсы|Все курсы|Course|Search courses/i);
    expect(errors, `JavaScript errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('Страница входа доступна', async ({ page }) => {
    await page.goto('/login/index.php');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
