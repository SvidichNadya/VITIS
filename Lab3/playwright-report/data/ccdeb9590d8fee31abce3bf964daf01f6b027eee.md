# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: secuutiry.SessionFixation.spec.ts >> SESSION SECURITY — безопасная проверка публичной сессии >> Сессионные cookie фиксируются и проверяются по атрибутам
- Location: tests\secuutiry.SessionFixation.spec.ts:5:7

# Error details

```
Error: browserContext.newPage: Executable doesn't exist at C:\Users\NS\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe
╔═════════════════════════════════════════════════════════════════╗
║ Video rendering requires ffmpeg binary.                         ║
║ Downloading it will not affect any of the system-wide settings. ║
║ Please run the following command:                               ║
║                                                                 ║
║     npx playwright install ffmpeg                               ║
║                                                                 ║
║ <3 Playwright Team                                              ║
╚═════════════════════════════════════════════════════════════════╝
```