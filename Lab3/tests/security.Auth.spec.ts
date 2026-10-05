test.describe('КРИТИЧЕСКИЕ: Обход аутентификации', () => {
  const protectedPaths = [
    '/my/',
    '/admin/',
    '/user/profile.php',
    '/course/management.php',
    '/report/log/index.php',
    '/admin/roles/manage.php',
  ];

  for (const path of protectedPaths) {
    test(`Прямой доступ к ${path} без авторизации`, async ({ request }) => {
      const response = await request.get(path, { 
        failOnStatusCode: false,
        maxRedirects: 0 
      });
      
      const status = response.status();
      const location = response.headers()['location'] || '';
      
      // Должен быть редирект на логин или 403
      const isProtected = 
        (status >= 300 && status < 400 && /login/i.test(location)) ||
        status === 403 ||
        status === 401;
      
      expect(isProtected, 
        `КРИТИЧНО: ${path} доступен без авторизации (HTTP ${status}, Location: ${location})`
      ).toBeTruthy();
    });
  }

  test('LTI-провайдер не пропускает заблокированных пользователей', async ({ request }) => {
    // Известная уязвимость CVE-2025-67857: обход через LTI
    const response = await request.post('/mod/lti/auth.php', {
      form: {
        // Параметры LTI-запроса
        user_id: 'suspended_user',
        roles: 'Learner',
      },
      failOnStatusCode: false
    });
    
    expect(response.status()).not.toBe(200);
  });

  test('Восстановление пароля не раскрывает существование пользователя', async ({ request }) => {
    const response1 = await request.post('/login/forgot_password.php', {
      form: { username: 'admin' },
      failOnStatusCode: false
    });
    
    const response2 = await request.post('/login/forgot_password.php', {
      form: { username: 'nonexistent_user_12345' },
      failOnStatusCode: false
    });
    
    const body1 = await response1.text();
    const body2 = await response2.text();
    
    // Ответы не должны отличаться (user enumeration)
    const isDifferent = body1.length !== body2.length || 
                       !body1.includes('не найден') && body2.includes('не найден');
    
    expect(isDifferent, 
      'Разные ответы для существующего и несуществующего пользователя (user enumeration)'
    ).toBeFalsy();
  });
});