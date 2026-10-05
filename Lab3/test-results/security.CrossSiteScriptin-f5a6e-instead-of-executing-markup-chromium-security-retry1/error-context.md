# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.CrossSiteScripting.spec.ts >> XSS SECURITY SMOKE >> Course search encodes a harmless marker instead of executing markup
- Location: tests\security.CrossSiteScripting.spec.ts:7:7

# Error details

```
Error: expect(received).toBeFalsy()

Received: true
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { safeGet, finding } from './support/evidence';
  3  | 
  4  | test.describe('XSS SECURITY SMOKE', () => {
  5  |   const harmlessMarkers = ['VITIS_XSS_TEST_7F3A', 'VITIS_XSS_QUOTE_91B2'];
  6  | 
  7  |   test('Course search encodes a harmless marker instead of executing markup', async ({ request }, testInfo) => {
  8  |     for (const marker of harmlessMarkers) {
  9  |       const result = await safeGet(request, '/course/search.php', testInfo, {
  10 |         params: { search: marker }
  11 |       });
  12 |       const executable = /<script|onerror\s*=|onload\s*=|javascript:/i.test(result.body);
  13 |       if (executable) {
  14 |         finding(testInfo, 'HIGH', 'Potential reflected XSS',
  15 |           'Executable-looking markup was returned in a search response.',
  16 |           'Ensure untrusted search parameters are HTML-escaped and use contextual output encoding.');
  17 |       }
> 18 |       expect(executable).toBeFalsy();
     |                          ^ Error: expect(received).toBeFalsy()
  19 |       if (result.warningTriggered || result.serverError) break;
  20 |     }
  21 |   });
  22 | 
  23 |   test('DOM does not contain an executable script marker from URL fragment', async ({ page }, testInfo) => {
  24 |     const marker = 'VITIS_DOM_MARKER_52C1';
  25 |     await page.goto('/course/index.php#' + encodeURIComponent(marker));
  26 |     const html = await page.content();
  27 |     expect(html).not.toContain('<script');
  28 |     expect(html).not.toContain('onerror=');
  29 |     await testInfo.attach('dom-xss-check.txt', {
  30 |       body: Buffer.from(`marker=${marker}\nurl=${page.url()}`, 'utf8'),
  31 |       contentType: 'text/plain'
  32 |     });
  33 |   });
  34 | 
  35 |   test('Stored XSS remains isolated behind explicit test credentials', async () => {
  36 |     test.skip(!process.env.TEST_USER || !process.env.TEST_PASS,
  37 |       'Requires a dedicated test account and isolated writable test data.');
  38 |   });
  39 | });
  40 | 
```