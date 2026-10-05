import { test, expect } from '@playwright/test';
import { safeGet, finding } from './support/evidence';

test.describe('AUTHENTICATION & AUTHORIZATION', () => {
  const protectedPaths = ['/my/', '/admin/', '/user/profile.php', '/report/log/index.php'];

  for (const path of protectedPaths) {
    test(`Unauthenticated access to ${path} is denied`, async ({ request }, testInfo) => {
      const response = await request.get(path, { failOnStatusCode: false, maxRedirects: 0 });
      const location = response.headers()['location'] || '';
      const body = await response.text();
      const denied = response.status() === 401 || response.status() === 403 ||
        (response.status() >= 300 && response.status() < 400 && /login/i.test(location)) ||
        /you are not logged in|вы не вошли|вход/i.test(body);

      if (!denied) {
        finding(testInfo, 'HIGH', 'Potential authentication bypass',
          `${path} returned HTTP ${response.status()} without an obvious login/deny boundary.`,
          'Verify authorization middleware and reproduce using a dedicated low-privilege test account.');
      }
      expect(denied).toBeTruthy();
    });
  }

  test('Login page does not disclose password values or secrets in HTML', async ({ request }, testInfo) => {
    const result = await safeGet(request, '/login/index.php', testInfo);
    expect(result.body).not.toMatch(/password\s*[:=]\s*[^<\s]+/i);
    expect(result.body).not.toMatch(/api[_-]?key\s*[:=]/i);
  });

  test('Forgot-password endpoint has bounded response time and generic public behavior', async ({ request }, testInfo) => {
    // Do not enumerate real accounts and do not submit repeated requests.
    const result = await safeGet(request, '/login/forgot_password.php', testInfo, {
      warningMs: 2000,
      timeoutMs: 10000
    });
    expect(result.status ?? 599).toBeLessThan(500);
    if (result.warningTriggered) {
      finding(testInfo, 'MEDIUM', 'Slow password-recovery endpoint',
        'A single public recovery-page request exceeded the 2s evidence threshold.',
        'Inspect application and mail-service timings; do not infer account enumeration from this smoke test alone.');
    }
  });
});
