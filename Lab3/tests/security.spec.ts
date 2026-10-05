import { test, expect } from '@playwright/test';

const protectedPaths = [
  '/my/',
  '/user/profile.php',
  '/user/index.php',
  '/admin/',
  '/report/log/index.php'
];

function hasLoginMarker(body: string) {
  return /Вы не вошли в систему|You are not logged in|Log in|Вход/i.test(body);
}

test.describe('LMS — безопасные security smoke checks', () => {
  test('HTTPS не должен редиректить на HTTP', async ({ request }) => {
    const response = await request.get('/');
    expect(response.url()).toMatch(/^https:\/\//);
  });

  test('Базовые security headers проверяются и фиксируются в отчёте', async ({ request }) => {
    const response = await request.get('/');
    const h = response.headers();

    test.info().annotations.push({
      type: 'headers',
      description: JSON.stringify({
        'strict-transport-security': h['strict-transport-security'] ?? null,
        'content-security-policy': h['content-security-policy'] ?? null,
        'x-content-type-options': h['x-content-type-options'] ?? null,
        'x-frame-options': h['x-frame-options'] ?? null,
        'referrer-policy': h['referrer-policy'] ?? null,
        'permissions-policy': h['permissions-policy'] ?? null
      })
    });

    // Это диагностический тест: отсутствие конкретного заголовка — finding,
    // а не попытка эксплуатации приложения.
    expect(response.status()).toBeLessThan(500);
  });

  for (const path of protectedPaths) {
    test(`Неавторизованный доступ к ${path} не раскрывает защищённые данные`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
      const body = await page.locator('body').innerText();
      const finalUrl = page.url();

      const looksLikeLogin = hasLoginMarker(body) || /\/login\//i.test(finalUrl);
      expect(
        looksLikeLogin,
        `Potential access-control issue: ${path} returned ${finalUrl} without an obvious login boundary`
      ).toBeTruthy();
    });
  }

  test('robots.txt не должен случайно раскрывать секреты', async ({ request }) => {
    const response = await request.get('/robots.txt');
    if (response.status() === 200) {
      const text = await response.text();
      expect(text).not.toMatch(/password|secret|api[_-]?key|token/i);
    }
  });

  test('Сессия не должна выставлять cookie с явным отсутствием Secure/SameSite', async ({ context, page }) => {
    await page.goto('/');
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => /session|moodle|sess/i.test(c.name));

    for (const cookie of sessionCookies) {
      expect(cookie.secure, `${cookie.name} should be Secure`).toBeTruthy();
      expect(cookie.sameSite, `${cookie.name} should define SameSite`).not.toBe('None');
    }
  });

  test('Внешняя навигация через wantsurl не должна автоматически уводить на произвольный домен', async ({ request }) => {
    const target = encodeURIComponent('https://example.com/');
    const response = await request.get(`/login/index.php?wantsurl=${target}`, {
      maxRedirects: 0,
      failOnStatusCode: false
    });
    const location = response.headers()['location'] || '';
    expect(location, 'Possible open redirect').not.toMatch(/^https:\/\/example\.com/i);
  });
});
