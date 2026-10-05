// tests/security-critical.spec.ts
import { test, expect } from '@playwright/test';

test.describe('КРИТИЧЕСКИЕ: SQL-инъекции', () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' UNION SELECT NULL--",
    "'; DROP TABLE mdl_user;--",
    "1' AND SLEEP(5)--",
    "' OR '1'='1' /*",
  ];

  test('Параметр поиска курсов уязвим к SQLi', async ({ request }) => {
    for (const payload of sqlPayloads) {
      const response = await request.get('/course/search.php', {
        params: { search: payload },
        failOnStatusCode: false
      });

      // Признаки уязвимости: 500, странные ответы, задержки
      const status = response.status();
      const body = await response.text();
      
      // SQL-ошибка в теле ответа — серьёзный признак
      const hasSqlError = /SQL syntax|mysql_|ORA-|PostgreSQL|SQLite|syntax error/i.test(body);
      
      // Проверка на time-based blind SQLi
      const startTime = Date.now();
      if (payload.includes('SLEEP')) {
        const timeResponse = await request.get('/course/search.php', {
          params: { search: payload },
          failOnStatusCode: false
        });
        const elapsed = Date.now() - startTime;
        expect(elapsed, `Time-based SQLi: задержка ${elapsed}ms`).toBeLessThan(4000);
      }

      expect(hasSqlError, 
        `SQL-ошибка при payload "${payload}": возможна SQL-инъекция`
      ).toBeFalsy();
      
      expect(status, 
        `HTTP ${status} при SQL-payload "${payload}"`
      ).toBeLessThan(500);
    }
  });

  test('Параметр id в профиле пользователя уязвим к SQLi', async ({ request }) => {
    for (const payload of sqlPayloads) {
      const response = await request.get('/user/view.php', {
        params: { id: payload },
        failOnStatusCode: false
      });
      
      const body = await response.text();
      const hasSqlError = /SQL syntax|mysql_|ORA-|PostgreSQL|SQLite/i.test(body);
      
      expect(hasSqlError, 
        `SQL-ошибка в профиле при id="${payload}"`
      ).toBeFalsy();
    }
  });
});