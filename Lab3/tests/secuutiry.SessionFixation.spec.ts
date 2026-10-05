test.describe('КРИТИЧЕСКИЕ: Управление сессией', () => {
  test('Идентификатор сессии меняется после логина', async ({ page, context }) => {
    // Получаем cookie ДО логина
    await page.goto('/');
    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find(c => 
      /MoodleSession|session/i.test(c.name)
    )?.value;

    // Логинимся (требуются тестовые данные)
    if (process.env.TEST_USER && process.env.TEST_PASS) {
      await page.goto('/login/index.php');
      await page.fill('input[name="username"]', process.env.TEST_USER);
      await page.fill('input[name="password"]', process.env.TEST_PASS);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/my\//, { timeout: 15000 });

      const cookiesAfter = await context.cookies();
      const sessionAfter = cookiesAfter.find(c => 
        /MoodleSession|session/i.test(c.name)
      )?.value;

      expect(sessionAfter, 
        'КРИТИЧНО: Session ID не изменился после логина (Session Fixation)'
      ).not.toBe(sessionBefore);
    } else {
      test.skip(true, 'Требуются тестовые учётные данные');
    }
  });

  test('sesskey не может быть предсказан или получен без авторизации', async ({ request }) => {
    const response = await request.get('/login/index.php', {
      failOnStatusCode: false
    });
    
    const body = await response.text();
    
    // sesskey не должен присутствовать в HTML для неавторизованных
    const sesskeyMatch = body.match(/sesskey["\s=]+([a-zA-Z0-9]+)/);
    
    expect(sesskeyMatch, 
      'sesskey раскрыт неавторизованному пользователю'
    ).toBeNull();
  });

  test('Cookie сессии должны иметь флаги Secure, HttpOnly, SameSite', async ({ page, context }) => {
    await page.goto('/');
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => 
      /MoodleSession|session|moodle/i.test(c.name)
    );

    for (const cookie of sessionCookies) {
      expect(cookie.secure, 
        `${cookie.name} не имеет флага Secure`
      ).toBeTruthy();
      
      expect(cookie.httpOnly, 
        `${cookie.name} не имеет флага HttpOnly`
      ).toBeTruthy();
      
      expect(cookie.sameSite, 
        `${cookie.name} не имеет SameSite`
      ).not.toBe('None');
    }
  });
});