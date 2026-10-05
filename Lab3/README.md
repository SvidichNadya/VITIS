# LMS SFEDU — Playwright Lab 3

Учебный набор автотестов для `https://lms.sfedu.ru/`.

## Важно

Security smoke checks рассчитаны на безопасное, неразрушающее тестирование. Не добавляйте сюда brute-force, нагрузочные атаки, удаление/изменение данных, эксплуатацию найденных уязвимостей или обход авторизации без явного разрешения владельца системы.

## Запуск

```bash
npm install
npx playwright install chromium
npm test
npm run test:security
npm run test:functional
npm run report
```

HTML-отчёт появится в `playwright-report/`.

## Что демонстрирует лабораторная

- автоматическое открытие и проверку страниц;
- assertions;
- группировку тестов;
- проверку негативных сценариев;
- security smoke checks;
- анализ HTTP-заголовков;
- проверку границы авторизации;
- screenshots/video/trace при падении;
- HTML-отчёт Playwright.

## Переменные

`BASE_URL` позволяет тестировать стенд:

```powershell
$env:BASE_URL='https://lms.sfedu.ru'
npx playwright test
```
