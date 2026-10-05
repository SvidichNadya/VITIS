import { test, expect } from '@playwright/test';
import { safeGet, finding } from './support/evidence';

test.describe('INPUT VALIDATION / SQL ERROR DISCLOSURE', () => {
  const inertInputs = ["VITIS'", 'VITIS"', 'VITIS\\'];

  test('Search input does not disclose database errors', async ({ request }, testInfo) => {
    for (const value of inertInputs) {
      const result = await safeGet(request, '/course/search.php', testInfo, {
        params: { search: value },
        warningMs: 2000,
        timeoutMs: 10000
      });
      const dbError = /SQLSTATE|mysql_|ORA-\d+|PostgreSQL|SQLite|syntax error/i.test(result.body);
      if (dbError) {
        finding(testInfo, 'HIGH', 'Database error disclosure',
          'A database/SQL error signature was returned for an inert input.',
          'Use parameterized queries and return generic application errors without DB diagnostics.');
      }
      expect(dbError).toBeFalsy();
      expect(result.status ?? 599).toBeLessThan(500);
      if (result.warningTriggered || result.serverError) break;
    }
  });

  test('User-view id rejects malformed identifiers without SQL error disclosure', async ({ request }, testInfo) => {
    const result = await safeGet(request, '/user/view.php', testInfo, {
      params: { id: 'not-a-valid-user-id' }
    });
    expect(result.body).not.toMatch(/SQLSTATE|mysql_|ORA-\d+|PostgreSQL|SQLite/i);
    expect(result.status ?? 599).toBeLessThan(500);
  });
});
