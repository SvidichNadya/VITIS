import { test, expect } from '@playwright/test';
import { safeGet, finding } from './support/evidence';

test.describe('OPEN REDIRECT SECURITY SMOKE', () => {
  test('wantsurl cannot directly redirect to an external origin', async ({ request }, testInfo) => {
    const result = await safeGet(request, '/login/index.php', testInfo, {
      params: { wantsurl: 'https://example.com/' }
    });
    const location = result.headers['location'] || '';
    const external = /^(https?:)?\/\/example\.com/i.test(location);
    if (external) {
      finding(testInfo, 'HIGH', 'Open redirect candidate',
        'The login endpoint returned an external Location for wantsurl.',
        'Allow only same-origin relative destinations and reject external schemes/hosts.');
    }
    expect(external).toBeFalsy();
  });

  test('Protocol-relative redirect is rejected', async ({ request }, testInfo) => {
    const result = await safeGet(request, '/login/index.php', testInfo, {
      params: { wantsurl: '//example.com/' }
    });
    const location = result.headers['location'] || '';
    expect(location).not.toMatch(/^\/\/example\.com/i);
  });
});
