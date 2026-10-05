import { test, expect } from '@playwright/test';
import { safeGet, guardedNavigation, finding, attachJson, attachText } from './support/evidence';

test.describe('ADVANCED SECURITY — safe public diagnostics', () => {
  test('Security headers are measured without treating optional headers as functional failures', async ({ request }, testInfo) => {
    const response = await request.get('/', { failOnStatusCode: false });
    const headers = response.headers();
    const expected = [
      ['strict-transport-security', 'HSTS'],
      ['x-content-type-options', 'X-Content-Type-Options'],
      ['content-security-policy', 'CSP'],
      ['referrer-policy', 'Referrer-Policy']
    ] as const;
    const missing = expected.filter(([key]) => !headers[key]).map(([, label]) => label);
    await attachJson(testInfo, 'security-headers.json', { status: response.status(), missing, headers });
    if (missing.length) {
      finding(testInfo, 'MEDIUM', 'Security headers require review',
        'The public response does not expose: ' + missing.join(', '),
        'Review the reverse proxy/web-server security header policy and decide which headers are required for this deployment.');
    }
    expect(response.status()).toBeLessThan(500);
  });

  test('Public pages do not expose obvious server-side exception details', async ({ request }, testInfo) => {
    const paths = ['/', '/login/index.php', '/course/index.php'];
    const leaks: string[] = [];
    for (const path of paths) {
      const result = await safeGet(request, path, testInfo);
      if (/stack trace|fatal error|uncaught exception|SQLSTATE|mysql_|ORA-\d+|PostgreSQL|SQLite|traceback/i.test(result.body)) leaks.push(path);
      if (result.warningTriggered || result.serverError) break;
    }
    if (leaks.length) {
      finding(testInfo, 'HIGH', 'Possible error information disclosure',
        'Server-side exception or database diagnostic markers were found on: ' + leaks.join(', '),
        'Return generic client-facing errors and keep diagnostics server-side.');
    }
    await attachJson(testInfo, 'error-disclosure-summary.json', { checked: paths, leaks });
    expect(leaks).toEqual([]);
  });

  test('Protected navigation reaches an authentication boundary', async ({ page }, testInfo) => {
    const protectedPaths = ['/my/', '/user/profile.php', '/report/log/index.php'];
    const results = [];
    for (const path of protectedPaths) {
      const result = await guardedNavigation(page, path, testInfo);
      const body = await page.locator('body').innerText().catch(() => '');
      const boundary = /login|вход|you are not logged in|вы не вошли/i.test(page.url() + ' ' + body);
      results.push({ path, status: result.response?.status() ?? null, finalUrl: page.url(), boundary });
      if (!boundary) {
        finding(testInfo, 'HIGH', 'Potential authorization boundary violation',
          path + ' did not show an obvious login/authorization boundary.',
          'Verify access control server-side and reproduce with a dedicated low-privilege account.');
      }
    }
    await attachJson(testInfo, 'protected-boundaries.json', results);
    expect(results.every(r => r.boundary)).toBeTruthy();
  });

  test('One ordinary request provides an availability baseline', async ({ request }, testInfo) => {
    const result = await safeGet(request, '/course/index.php', testInfo, { warningMs: 2000, timeoutMs: 10000 });
    await attachText(testInfo, 'availability-summary.txt',
      'Exactly one ordinary GET was used. No burst, recursion, large payload or retry loop is performed.\n' +
      JSON.stringify(result, null, 2));
    if (result.warningTriggered) {
      finding(testInfo, 'MEDIUM', 'Slow public response',
        'A single ordinary request exceeded the 2s observation threshold.',
        'Treat this as a timing observation, not a DoS result. Inspect server and upstream timings before any authorized load test.');
    }
    expect(result.status ?? 599).toBeLessThan(500);
  });

  test('TRACE response is recorded instead of assuming a fixed status code', async ({ request }, testInfo) => {
    const response = await request.fetch('/login/index.php', {
      method: 'TRACE', failOnStatusCode: false, maxRedirects: 0
    });
    const evidence = {
      status: response.status(),
      allow: response.headers()['allow'] ?? null,
      contentType: response.headers()['content-type'] ?? null,
      bodyPreview: (await response.text()).slice(0, 500)
    };
    await attachJson(testInfo, 'trace-response.json', evidence);
    if (response.status() === 200) {
      finding(testInfo, 'MEDIUM', 'TRACE method enabled',
        'The public endpoint returned HTTP 200 to TRACE.',
        'Disable TRACE at the reverse proxy/web server unless there is a documented reason to expose it.');
    }
    expect(response.status()).toBeLessThan(500);
  });
});
