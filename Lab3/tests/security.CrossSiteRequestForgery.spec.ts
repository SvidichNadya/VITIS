test.describe('КРИТИЧЕСКИЕ: CSRF-защита', () => {
  test('Формы без CSRF-токена (sesskey)', async ({ page }) => {
    await page.goto('/login/index.php');
    
    // Проверяем наличие sesskey в критичных формах
    const forms = await page.locator('form').all();
    for (const form of forms) {
      const hasSesskey = await form.locator('input[name="sesskey"]').count() > 0;
      const action = await form.getAttribute('action');
      
      // Логин может не иметь sesskey, но другие формы должны
      if (action && !action.includes('login')) {
        expect(hasSesskey, 
          `Форма ${action} не содержит CSRF-токен (sesskey)`
        ).toBeTruthy();
      }
    }
  });

  test('Критичные действия отклоняются без sesskey', async ({ request }) => {
    // Попытка выполнить действие без CSRF-токена
    const response = await request.post('/user/edit.php', {
      form: {
        id: '1',
        description: 'Hacked!',
        // sesskey отсутствует
      },
      failOnStatusCode: false
    });
    
    // Должен быть 403 или редирект на логин
    expect([302, 403], 
      `Действие без CSRF-токена вернуло ${response.status()}`
    ).toContain(response.status());
  });

  test('Смена пароля без sesskey не выполняется', async ({ request }) => {
    const response = await request.post('/login/change_password.php', {
      form: {
        newpassword1: 'hacked123',
        newpassword2: 'hacked123',
        // sesskey отсутствует
      },
      failOnStatusCode: false
    });
    
    expect([302, 403]).toContain(response.status());
  });
});