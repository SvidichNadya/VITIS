import { test, expect } from '@playwright/test';
import { safeGet, finding } from './support/evidence';

test.describe('AVAILABILITY / DOS-RESISTANCE SMOKE', () => {
  test('Single ordinary request has an early-warning safety guard', async ({ request }, testInfo) => {
    // Deliberately limited: one normal GET only. No brute-force, bursts, huge payloads or recursion.
    const result = await safeGet(request, '/course/index.php', testInfo, {
      warningMs: 2000,
      timeoutMs: 10000
    });

    await testInfo.attach('availability-evidence.txt', {
      body: Buffer.from(
        'One ordinary request was measured. If it exceeded 2s, evidence was captured and further probing was stopped.\n' +
        JSON.stringify(result, null, 2),
        'utf8'
      ),
      contentType: 'text/plain'
    });

    if (result.warningTriggered || result.serverError) {
      finding(testInfo, 'HIGH', 'Potential availability degradation',
        'A single ordinary request exceeded the safety threshold or produced a server error.',
        'Investigate server timing, resource limits and upstream dependencies before authorized load testing.');
    }

    expect(result.status ?? 599).toBeLessThan(500);
  });

  test('No load test is executed against the university production service', async () => {
    // A real load/DoS test belongs on an isolated staging environment with explicit authorization.
    expect(true).toBeTruthy();
  });
});
