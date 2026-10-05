import { test } from '@playwright/test';
import { attachJson, finding } from './support/evidence';

async function inspect(request: any, path: string) {
  const started = Date.now();
  const response = await request.get(path, { failOnStatusCode: false, maxRedirects: 0, timeout: 10000 });
  const body = await response.text();
  return { path, status: response.status(), elapsedMs: Date.now() - started, headers: response.headers(), body: body.slice(0, 50000) };
}

test.describe('SECURITY AUDIT — black-box observations', () => {
  test('Public security baseline', async ({ request }, testInfo) => {
    const r = await inspect(request, '/');
    const missing = ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'referrer-policy'].filter(n => !r.headers[n]);
    if (missing.length) finding(testInfo, 'MEDIUM', 'Security headers require review', 'Missing: ' + missing.join(', '), 'Review the deployed security-header policy.');
    await attachJson(testInfo, 'security-baseline.json', { path: r.path, status: r.status, elapsedMs: r.elapsedMs, missingHeaders: missing, headers: r.headers });
  });

  test('Authentication boundary observation', async ({ request }, testInfo) => {
    const results = [];
    for (const path of ['/my/', '/user/profile.php', '/report/log/index.php']) {
      const r = await inspect(request, path);
      const location = r.headers.location || '';
      const denied = r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400 && /login/i.test(location)) || /you are not logged in|вы не вошли в систему/i.test(r.body);
      results.push({ path, status: r.status, location, denied });
      if (!denied) finding(testInfo, 'HIGH', 'Authorization boundary requires review', path + ' did not show an obvious unauthenticated deny/login response.', 'Verify the route with a dedicated low-privilege test account.');
    }
    await attachJson(testInfo, 'auth-boundary.json', results);
  });

  test('Error disclosure observation', async ({ request }, testInfo) => {
    const paths = ['/', '/login/index.php', '/course/index.php'];
    const leaks: string[] = [];
    for (const path of paths) {
      const r = await inspect(request, path);
      if (/stack trace|fatal error|uncaught exception|SQLSTATE|mysql_|ORA-\d+|PostgreSQL|SQLite|traceback/i.test(r.body)) leaks.push(path);
    }
    if (leaks.length) finding(testInfo, 'HIGH', 'Possible error information disclosure', 'Diagnostic markers observed on: ' + leaks.join(', '), 'Keep server diagnostics out of public responses.');
    await attachJson(testInfo, 'error-disclosure.json', { checked: paths, leaks });
  });

  test('Open redirect observation', async ({ request }, testInfo) => {
    const r = await inspect(request, '/login/index.php?wantsurl=https%3A%2F%2Fexample.com%2F');
    const location = r.headers.location || '';
    const external = /^(https?:)?\/\/example\.com/i.test(location);
    if (external) finding(testInfo, 'HIGH', 'Open redirect candidate', 'The login endpoint returned an external Location.', 'Allow only same-origin destinations.');
    await attachJson(testInfo, 'open-redirect.json', { status: r.status, location, external });
  });

  test('TRACE observation', async ({ request }, testInfo) => {
    const response = await request.fetch('/login/index.php', { method: 'TRACE', failOnStatusCode: false, maxRedirects: 0 });
    const body = await response.text();
    if (response.status() === 200) finding(testInfo, 'MEDIUM', 'TRACE is enabled', 'TRACE returned HTTP 200.', 'Disable TRACE at the web server/reverse proxy.');
    await attachJson(testInfo, 'trace.json', { status: response.status(), allow: response.headers().allow || null, bodyPreview: body.slice(0, 500) });
  });
});
