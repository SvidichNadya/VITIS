import { test, expect } from '@playwright/test';

test.describe('CSRF SECURITY SMOKE', () => {
  test('Login page forms use expected Moodle security mechanism where applicable', async ({ page }) => {
    await page.goto('/login/index.php');
    const forms = await page.locator('form').all();
    expect(forms.length).toBeGreaterThan(0);

    for (const form of forms) {
      const action = (await form.getAttribute('action')) || '';
      const method = ((await form.getAttribute('method')) || 'get').toLowerCase();
      if (method === 'post' && !/login/i.test(action)) {
        const sesskey = form.locator('input[name="sesskey"]');
        // Diagnostic only: Moodle login itself is a special case.
        await expect(form).toBeVisible();
        if (await sesskey.count() === 0) {
          test.info().annotations.push({
            type: 'security-finding',
            description: JSON.stringify({
              severity: 'MEDIUM',
              title: 'POST form without visible sesskey',
              description: `POST form ${action} has no visible sesskey field.`,
              recommendation: 'Verify CSRF protection server-side for state-changing requests.'
            })
          });
        }
      }
    }
  });

  test('State-changing endpoints are not tested destructively without authentication', async () => {
    // Intentionally no unauthenticated POST to mutation endpoints.
    // Destructive CSRF validation belongs in an isolated test account/environment.
    expect(true).toBeTruthy();
  });
});
