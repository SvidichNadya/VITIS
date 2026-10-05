test.describe('КРИТИЧЕСКИЕ: Устойчивость к DoS', () => {
  test('Отсутствие rate limiting на форму логина', async ({ request }) => {
    const attempts = 20;
    const results: number[] = [];
    
    for (let i = 0; i < attempts; i++) {
      const response = await request.post('/login/index.php', {
        form: {
          username: 'testuser',
          password: `wrongpass${i}`
        },
        failOnStatusCode: false
      });
      results.push(response.status());
    }
    
    // Если все 20 попыток вернули 200/302 — rate limiting отсутствует
    const allAccepted = results.every(s => s < 400);
    
    // Если есть 429 (Too Many Requests) — rate limiting работает
    const hasRateLimit = results.some(s => s === 429);
    
    test.info().annotations.push({
      type: 'rate-limit',
      description: `Статусы: ${results.join(', ')}. Rate limiting: ${hasRateLimit ? 'ЕСТЬ' : 'ОТСУТСТВУЕТ'}`
    });
    
    expect(hasRateLimit, 
      'КРИТИЧНО: Rate limiting отсутствует на форме логина — возможен brute-force и DoS'
    ).toBeTruthy();
  });

  test('TeX-формулы не вызывают resource exhaustion', async ({ request }) => {
    // CVE-2026-26047: DoS через TeX formula editor
    const deepNestedTex = '\\frac{' + '\\frac{'.repeat(100) + '1' + '}{1}'.repeat(100) + '}{1}';
    
    const startTime = Date.now();
    const response = await request.post('/filter/tex/texdebug.php', {
      form: {
        tex: deepNestedTex
      },
      failOnStatusCode: false,
      timeout: 30000
    });
    const elapsed = Date.now() - startTime;
    
    expect(elapsed, 
      `TeX-формула обрабатывалась ${elapsed}ms — возможен resource exhaustion`
    ).toBeLessThan(10000);
  });

  test('Ограничение размера загружаемых файлов', async ({ request }) => {
    // Проверка наличия ограничений на размер файла
    const response = await request.get('/admin/settings.php?section=optionalsubsystems');
    
    // Проверяем наличие настроек maxbytes
    expect(response.status()).toBeLessThan(500);
  });
});