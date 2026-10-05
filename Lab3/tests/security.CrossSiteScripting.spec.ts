test.describe('КРИТИЧЕСКИЕ: XSS-инъекции', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
  ];

  test('Отражённый XSS в поиске курсов', async ({ page }) => {
    for (const payload of xssPayloads) {
      let alertFired = false;
      page.on('dialog', async dialog => {
        alertFired = true;
        await dialog.dismiss();
      });

      await page.goto(`/course/search.php?search=${encodeURIComponent(payload)}`);
      await page.waitForTimeout(1000);

      expect(alertFired, 
        `XSS выполнен через поиск: payload="${payload}"`
      ).toBeFalsy();
    }
  });

  test('DOM-based XSS через hash-параметр', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async () => { alertFired = true; });

    await page.goto(`/course/index.php#${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    await page.waitForTimeout(1000);

    expect(alertFired).toBeFalsy();
  });

  test('Stored XSS в профиле пользователя (если есть доступ)', async ({ page }) => {
    // Требуется авторизация — пропускаем, если нет тестовых учётных данных
    test.skip(!process.env.TEST_USER || !process.env.TEST_PASS, 
      'Требуются тестовые учётные данные');
    
    // Логин, переход в профиль, ввод payload в поле "О себе"
    // и проверка, что скрипт не выполняется при просмотре профиля
  });
});