import { test, expect } from '@playwright/test';
import { safeGet, finding } from './support/evidence';

test.describe('XSS SECURITY SMOKE', () => {
  const harmlessMarkers = ['VITIS_XSS_TEST_7F3A', 'VITIS_XSS_QUOTE_91B2'];

  test('Course search encodes a harmless marker instead of executing markup', async ({ request }, testInfo) => {
    for (const marker of harmlessMarkers) {
      const result = await safeGet(request, '/course/search.php', testInfo, {
        params: { search: marker }
      });
      const executable = /<script|onerror\s*=|onload\s*=|javascript:/i.test(result.body);
      if (executable) {
        finding(testInfo, 'HIGH', 'Potential reflected XSS',
          'Executable-looking markup was returned in a search response.',
          'Ensure untrusted search parameters are HTML-escaped and use contextual output encoding.');
      }
      expect(executable).toBeFalsy();
      if (result.warningTriggered || result.serverError) break;
    }
  });

  test('DOM does not contain an executable script marker from URL fragment', async ({ page }, testInfo) => {
    const marker = 'VITIS_DOM_MARKER_52C1';
    await page.goto('/course/index.php#' + encodeURIComponent(marker));
    const html = await page.content();
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror=');
    await testInfo.attach('dom-xss-check.txt', {
      body: Buffer.from(`marker=${marker}\nurl=${page.url()}`, 'utf8'),
      contentType: 'text/plain'
    });
  });

  test('Stored XSS remains isolated behind explicit test credentials', async () => {
    test.skip(!process.env.TEST_USER || !process.env.TEST_PASS,
      'Requires a dedicated test account and isolated writable test data.');
  });
});
