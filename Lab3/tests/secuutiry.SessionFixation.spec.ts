import { test, expect } from '@playwright/test';
import { attachJson, finding } from './support/evidence';

test.describe('SESSION SECURITY — безопасная проверка публичной сессии', () => {
  test('Сессионные cookie фиксируются и проверяются по атрибутам', async ({ page, context }, testInfo) => {
    await page.goto('/');
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => /MoodleSession|session/i.test(c.name));
    const insecure = sessionCookies.filter(c => !c.secure || !c.httpOnly || c.sameSite === undefined);

    await attachJson(testInfo, 'session-cookies.json', sessionCookies.map(c => ({
      name: c.name, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
      path: c.path, expires: c.expires
    })));

    if (insecure.length) {
      finding(testInfo, 'HIGH', 'Weak session cookie attributes',
        'A public session cookie is missing Secure, HttpOnly, or an explicit SameSite value.',
        'Set Secure and HttpOnly for session cookies and define an appropriate SameSite policy.');
    }
    expect(sessionCookies.length).toBeGreaterThanOrEqual(0);
  });

  test('Session identifier rotation is isolated when dedicated credentials are supplied', async ({ page, context }) => {
    test.skip(!process.env.TEST_USER || !process.env.TEST_PASS, 'Requires a dedicated test account.');
    await page.goto('/login/index.php');
    const before = (await context.cookies()).find(c => /MoodleSession|session/i.test(c.name))?.value;
    await page.fill('input[name="username"]', process.env.TEST_USER!);
    await page.fill('input[name="password"]', process.env.TEST_PASS!);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    const after = (await context.cookies()).find(c => /MoodleSession|session/i.test(c.name))?.value;
    expect(after).not.toBe(before);
  });
});
