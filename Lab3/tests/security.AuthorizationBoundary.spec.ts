import { test, expect } from '@playwright/test';
import { attachText, capturePageEvidence, finding } from './support/evidence';

const A_USER = process.env.TEST_USER_A;
const A_PASS = process.env.TEST_PASS_A;
const B_ID = process.env.TEST_USER_B_ID;

test.describe('AUTHORIZATION / IDOR — two-account proof', () => {
  test.skip(!A_USER || !A_PASS || !B_ID,
    'Requires a dedicated test account A and the numeric user ID of dedicated test account B.');

  test('Account A cannot read Account B private edit page', async ({ page }, testInfo) => {
    await page.goto('/login/index.php');
    await page.fill('input[name="username"]', A_USER!);
    await page.fill('input[name="password"]', A_PASS!);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded');

    const loggedInUrl = page.url();
    await attachText(testInfo, 'account-a-login.txt',
      `loggedInUrl=${loggedInUrl}\naccountA=${A_USER}\ntargetUserId=${B_ID}`);

    const response = await page.goto(`/user/edit.php?id=${encodeURIComponent(B_ID!)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    const status = response?.status() ?? 0;
    const body = await page.locator('body').innerText().catch(() => '');
    const url = page.url();

    const looksLikePrivateEditForm =
      /Edit profile|Редактировать профиль/i.test(body) &&
      /username|email|firstname|lastname/i.test(body);

    await capturePageEvidence(page, testInfo, 'idor-edit-page', {
      accountA: A_USER,
      targetUserId: B_ID,
      status,
      finalUrl: url,
      looksLikePrivateEditForm,
      proofRule: 'A must not receive B private edit form.'
    });

    if (status === 200 && looksLikePrivateEditForm) {
      finding(testInfo, 'HIGH', 'Potential IDOR / broken object-level authorization',
        `Authenticated account A received a profile-edit page for another user ID (${B_ID}). The response contains profile-edit fields.`,
        'Enforce server-side ownership/role authorization for /user/edit.php?id=... and verify that the requested user object belongs to the current principal or is explicitly administrable.');
    }

    expect(looksLikePrivateEditForm,
      'Account A must not receive another account\'s private profile-edit form. See attached screenshot/HTML/metadata.'
    ).toBeFalsy();
  });

  test('Account A cannot read Account B private preferences page', async ({ page }, testInfo) => {
    await page.goto('/login/index.php');
    await page.fill('input[name="username"]', A_USER!);
    await page.fill('input[name="password"]', A_PASS!);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded');

    const response = await page.goto(`/user/preferences.php?userid=${encodeURIComponent(B_ID!)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    const status = response?.status() ?? 0;
    const body = await page.locator('body').innerText().catch(() => '');
    const privatePreferences = /preferences|настройки/i.test(body) &&
      /email|notification|уведомления/i.test(body);

    await capturePageEvidence(page, testInfo, 'idor-preferences-page', {
      accountA: A_USER,
      targetUserId: B_ID,
      status,
      finalUrl: page.url(),
      privatePreferences
    });

    if (status === 200 && privatePreferences) {
      finding(testInfo, 'HIGH', 'Potential cross-user data exposure',
        `Account A received another user's preferences page (${B_ID}).`,
        'Enforce authorization for user preference resources using the authenticated principal, not only a URL parameter.');
    }

    expect(privatePreferences).toBeFalsy();
  });
});
