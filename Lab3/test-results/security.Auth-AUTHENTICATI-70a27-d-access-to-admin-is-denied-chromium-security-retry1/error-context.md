# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.Auth.spec.ts >> AUTHENTICATION & AUTHORIZATION >> Unauthenticated access to /admin/ is denied
- Location: tests\security.Auth.spec.ts:8:9

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { safeGet, finding } from './support/evidence';
  3  | 
  4  | test.describe('AUTHENTICATION & AUTHORIZATION', () => {
  5  |   const protectedPaths = ['/my/', '/admin/', '/user/profile.php', '/report/log/index.php'];
  6  | 
  7  |   for (const path of protectedPaths) {
  8  |     test(`Unauthenticated access to ${path} is denied`, async ({ request }, testInfo) => {
  9  |       const response = await request.get(path, { failOnStatusCode: false, maxRedirects: 0 });
  10 |       const location = response.headers()['location'] || '';
  11 |       const body = await response.text();
  12 |       const denied = response.status() === 401 || response.status() === 403 ||
  13 |         (response.status() >= 300 && response.status() < 400 && /login/i.test(location)) ||
  14 |         /you are not logged in|вы не вошли|вход/i.test(body);
  15 | 
  16 |       if (!denied) {
  17 |         finding(testInfo, 'HIGH', 'Potential authentication bypass',
  18 |           `${path} returned HTTP ${response.status()} without an obvious login/deny boundary.`,
  19 |           'Verify authorization middleware and reproduce using a dedicated low-privilege test account.');
  20 |       }
> 21 |       expect(denied).toBeTruthy();
     |                      ^ Error: expect(received).toBeTruthy()
  22 |     });
  23 |   }
  24 | 
  25 |   test('Login page does not disclose password values or secrets in HTML', async ({ request }, testInfo) => {
  26 |     const result = await safeGet(request, '/login/index.php', testInfo);
  27 |     expect(result.body).not.toMatch(/password\s*[:=]\s*[^<\s]+/i);
  28 |     expect(result.body).not.toMatch(/api[_-]?key\s*[:=]/i);
  29 |   });
  30 | 
  31 |   test('Forgot-password endpoint has bounded response time and generic public behavior', async ({ request }, testInfo) => {
  32 |     // Do not enumerate real accounts and do not submit repeated requests.
  33 |     const result = await safeGet(request, '/login/forgot_password.php', testInfo, {
  34 |       warningMs: 2000,
  35 |       timeoutMs: 10000
  36 |     });
  37 |     expect(result.status ?? 599).toBeLessThan(500);
  38 |     if (result.warningTriggered) {
  39 |       finding(testInfo, 'MEDIUM', 'Slow password-recovery endpoint',
  40 |         'A single public recovery-page request exceeded the 2s evidence threshold.',
  41 |         'Inspect application and mail-service timings; do not infer account enumeration from this smoke test alone.');
  42 |     }
  43 |   });
  44 | });
  45 | 
```