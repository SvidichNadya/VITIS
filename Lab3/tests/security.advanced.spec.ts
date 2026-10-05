import { test, expect } from '@playwright/test';
import { safeGet, guardedNavigation, finding } from './support/evidence';

test.describe('ADVANCED SECURITY & RESILIENCE', () => {
  test('security headers are measured with actionable evidence', async ({ request }, testInfo) => {
    const response = await request.get('/', { failOnStatusCode: false });
    const headers = response.headers();

    const expected = [
      ['strict-transport-security', 'HSTS'],
      ['x-content-type-options', 'X-Content-Type-Options'],
      ['content-security-policy', 'CSP'],
      ['referrer-policy', 'Referrer-Policy']
    ] as const;

    const missing = expected.filter(([key]) => !headers[key]).map(([, label]) => label);
    await testInfo.attach('security-headers.json', {
      body: Buffer.from(JSON.stringify({ status: response.status(), missing, headers }, null, 2)),
      contentType: 'application/json'
    });

    if (missing.length) {
      finding(testInfo, 'MEDIUM', 'Missing security headers',
        'The public response does not expose: ' + missing.join(', '),
        'Review the reverse proxy/web-server security header policy.');
    }
    expect(response.status()).toBeLessThan(500);
  });

  test('public pages do not expose obvious server-side exception details', async ({ request }, testInfo) => {
    const paths = ['/', '/login/index.php', '/course/index.php'];
    const leaks: string[] = [];

    for (const path of paths) {
      const result = await safeGet(request, path, testInfo);
      if (/stack trace|fatal error|uncaught exception|database error|SQLSTATE|traceback/i.test(result.body)) {
        leaks.push(path);
      }
      if (result.warningTriggered || result.serverError) break;
    }

    if (leaks.length) {
      finding(testInfo, 'HIGH', 'Possible error information disclosure',
        'Server-side exception markers were found on: ' + leaks.join(', '),
        'Return a generic error page and keep stack traces/database diagnostics server-side.');
    }
    expect(leaks).toEqual([]);
  });

  test('protected navigation has an explicit authentication boundary', async ({ page }, testInfo) => {
    const protectedPaths = ['/my/', '/user/profile.php', '/report/log/index.php'];
    for (const path of protectedPaths) {
      const result = await guardedNavigation(page, path, testInfo);
      const body = await page.locator('body').innerText().catch(() => '');
      const protectedBoundary = /login|вход|you are not logged in|вы не вошли/i.test(page.url() + ' ' + body);

      if (!protectedBoundary) {
        finding(testInfo, 'HIGH', 'Potential authorization boundary violation',
          path + ' did not show an obvious login/authorization boundary.',
          'Verify access control server-side and reproduce with a dedicated low-privilege account.');
      }

      expect(protectedBoundary).toBeTruthy();
      if (result.warningTriggered) break;
    }
  });

  test('stability guard: one deliberately slow-safe probe collects evidence and stops', async ({ request }, testInfo) => {
    // This is NOT a DoS test. It never sends a burst, recursion, huge payload, or destructive request.
    const result = await safeGet(request, '/course/index.php', testInfo, {
      warningMs: 2000,
      timeoutMs: 10000
    });

    await testInfo.attach('stability-summary.txt', {
      body: Buffer.from([
        'SAFE STABILITY PROBE',
        'The suite performs exactly one ordinary GET.',
        'A response taking >2s is recorded as an early warning.',
        'No additional load is generated after the warning.',
        '',
        JSON.stringify(result, null, 2)
      ].join('\n')),
      contentType: 'text/plain'
    });

    if (result.warningTriggered || result.serverError) {
      finding(testInfo, 'HIGH', 'Potential availability degradation detected',
        'A single ordinary request exceeded the safety threshold or returned a server error. This is evidence of degradation, not proof of a future crash.',
        'Investigate server timing, upstream dependencies, resource limits and application logs before any load testing.');
    }

    expect(result.status ?? 599).toBeLessThan(500);
  });

  test('HTTP method hardening: unexpected methods are not treated as successful mutations', async ({ request }, testInfo) => {
    const response = await request.fetch('/login/index.php', {
      method: 'TRACE',
      failOnStatusCode: false,
      maxRedirects: 0
    });

    await testInfo.attach('trace-response.txt', {
      body: Buffer.from(JSON.stringify({
        status: response.status(),
        allow: response.headers()['allow'] ?? null,
        contentType: response.headers()['content-type'] ?? null
      }, null, 2)),
      contentType: 'application/json'
    });

    expect(response.status()).not.toBe(200);
  });
});
