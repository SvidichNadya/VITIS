import { test, expect } from '@playwright/test';
import { attachJson } from './support/evidence';

test.describe('CSRF SECURITY SMOKE — диагностическая проверка', () => {
  test('Публичные формы фиксируются для последующей проверки CSRF-механизма', async ({ page }, testInfo) => {
    await page.goto('/login/index.php');
    const forms = await page.locator('form').evaluateAll(forms => forms.map(form => ({
      method: (form.getAttribute('method') || 'get').toLowerCase(),
      action: form.getAttribute('action') || '',
      hasSesskey: Boolean(form.querySelector('input[name="sesskey"]')),
      hasUsername: Boolean(form.querySelector('input[name="username"]')),
      hasPassword: Boolean(form.querySelector('input[name="password"]'))
    })));
    await attachJson(testInfo, 'csrf-form-inventory.json', {
      url: page.url(),
      note: 'Отсутствие sesskey на форме входа само по себе не является уязвимостью Moodle. State-changing POST без тестового аккаунта намеренно не выполняется.',
      forms
    });
    expect(forms.length).toBeGreaterThan(0);
  });

  test('Без тестовой учетной записи state-changing POST не выполняется', async () => {
    test.info().annotations.push({
      type: 'security-note',
      description: 'Глубокая CSRF-проверка требует изолированного тестового аккаунта и не должна изменять production-данные.'
    });
    expect(true).toBeTruthy();
  });
});
