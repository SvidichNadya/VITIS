import { test, expect } from '@playwright/test';

test.describe('SESSION SECURITY', () => {
  test('Session cookie has secure attributes', async ({ page, context }, testInfo) => {
    await page.goto('/');
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => /MoodleSession|session/i.test(c.name));

    for (const cookie of sessionCookies) {
      expect(cookie.secure, `${cookie.name} should have Secure`).toBeTruthy();
      expect(cookie.httpOnly, `${cookie.name} should have HttpOnly`).toBeTruthy();
      expect(cookie.sameSite, `${cookie.name} should define SameSite`).not.toBe('None');
    }

    await testInfo.attach('session-cookies.json', {
      body: Buffer.from(JSON.stringify(sessionCookies, null, 2), 'utf8'),
      contentType: 'application/json'
    });
  });

  test('Session identifier rotates after authentication when dedicated credentials are supplied', async ({ page, context }) => {
    test.skip(!process.env.TEST_USER || !process.env.TEST_PASS,
      'Requires a dedicated test account.');

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
