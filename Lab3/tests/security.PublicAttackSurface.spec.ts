import { test, expect } from '@playwright/test';
import { finding } from './support/evidence';

test.describe('BLACK-BOX PUBLIC ATTACK SURFACE', () => {
  test('public endpoint does not reflect an arbitrary Origin with credentials enabled', async ({ request }, testInfo) => {
    const origin = 'https://vitis-security-audit.invalid';
    const response = await request.get('/login/index.php', {
      headers: { Origin: origin },
      failOnStatusCode: false,
      maxRedirects: 0,
      timeout: 10000
    });

    const allowOrigin = response.headers()['access-control-allow-origin'] || '';
    const allowCredentials = (response.headers()['access-control-allow-credentials'] || '').toLowerCase();

    await testInfo.attach('cors-black-box-evidence.json', {
      body: Buffer.from(JSON.stringify({
        url: response.url(),
        status: response.status(),
        originSent: origin,
        accessControlAllowOrigin: allowOrigin || null,
        accessControlAllowCredentials: allowCredentials || null
      }, null, 2)),
      contentType: 'application/json'
    });

    const dangerousReflection = allowOrigin === origin && allowCredentials === 'true';

    if (dangerousReflection) {
      finding(
        testInfo,
        'HIGH',
        'Potential credentialed CORS misconfiguration',
        'The public login endpoint reflected an arbitrary Origin and simultaneously enabled credentials.',
        'Restrict Access-Control-Allow-Origin to an explicit trusted origin allow-list and enable credentials only where cross-origin access is required.'
      );
    }

    expect(dangerousReflection).toBeFalsy();
    expect(response.status()).toBeLessThan(500);
  });

  test('public endpoint does not expose Git repository metadata', async ({ request }, testInfo) => {
    const response = await request.get('/.git/HEAD', {
      failOnStatusCode: false,
      maxRedirects: 0,
      timeout: 10000
    });
    const body = await response.text();

    await testInfo.attach('git-metadata-black-box-evidence.json', {
      body: Buffer.from(JSON.stringify({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || null,
        bodyPreview: body.slice(0, 500)
      }, null, 2)),
      contentType: 'application/json'
    });

    const exposed = response.status() === 200 && /^ref:\s+refs\/heads\//i.test(body.trim());

    if (exposed) {
      finding(
        testInfo,
        'HIGH',
        'Exposed Git repository metadata',
        'The public service returned a Git HEAD reference from /.git/HEAD.',
        'Remove the .git directory from the deployed web root and block access to VCS metadata at the web-server layer.'
      );
    }

    expect(exposed).toBeFalsy();
  });

  test('public error responses do not disclose stack traces or database diagnostics', async ({ request }, testInfo) => {
    const candidates = [
      '/course/index.php?id=not-a-valid-id',
      '/user/view.php?id=not-a-valid-id'
    ];

    for (const path of candidates) {
      const response = await request.get(path, {
        failOnStatusCode: false,
        maxRedirects: 0,
        timeout: 10000
      });
      const body = await response.text();
      const disclosed = /stack trace|fatal error|uncaught exception|SQLSTATE|mysql_|ORA-\d+|PostgreSQL|SQLite|traceback/i.test(body);

      await testInfo.attach(
        'error-disclosure-' + Buffer.from(path).toString('base64url') + '.json',
        {
          body: Buffer.from(JSON.stringify({
            path,
            status: response.status(),
            disclosed,
            bodyPreview: body.slice(0, 1000)
          }, null, 2)),
          contentType: 'application/json'
        }
      );

      if (disclosed) {
        finding(
          testInfo,
          'HIGH',
          'Possible server-side error information disclosure',
          `A malformed public request to ${path} returned a recognizable stack-trace or database diagnostic marker.`,
          'Return generic client-facing errors and keep stack traces and database diagnostics on the server.'
        );
      }

      expect(disclosed).toBeFalsy();
      expect(response.status()).toBeLessThan(500);
    }
  });
});
