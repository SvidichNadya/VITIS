import { APIRequestContext, Page, TestInfo } from '@playwright/test';

export const WARNING_MS = Number(process.env.WARNING_MS || 2000);
export const HARD_TIMEOUT_MS = Number(process.env.HARD_TIMEOUT_MS || 10000);

export async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2), 'utf-8'),
    contentType: 'application/json'
  });
}

export async function attachText(testInfo: TestInfo, name: string, value: string) {
  await testInfo.attach(name, {
    body: Buffer.from(value, 'utf-8'),
    contentType: 'text/plain'
  });
}

export async function capturePageEvidence(page: Page, testInfo: TestInfo, label: string, metadata: Record<string, unknown> = {}) {
  await testInfo.attach(label + '-screenshot', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png'
  });
  await attachText(testInfo, label + '-url.txt', page.url());
  try { await attachText(testInfo, label + '-html.txt', await page.content()); } catch {}
  await attachJson(testInfo, label + '-metadata.json', {
    capturedAt: new Date().toISOString(),
    ...metadata
  });
}

export async function safeGet(
  request: APIRequestContext,
  path: string,
  testInfo: TestInfo,
  options: { warningMs?: number; timeoutMs?: number; params?: Record<string, string> } = {}
) {
  const warningMs = options.warningMs ?? WARNING_MS;
  const timeoutMs = options.timeoutMs ?? HARD_TIMEOUT_MS;
  const started = Date.now();
  let warningTriggered = false;
  const timer = setTimeout(() => { warningTriggered = true; }, warningMs);

  try {
    const response = await request.get(path, {
      params: options.params,
      timeout: timeoutMs,
      maxRedirects: 0,
      failOnStatusCode: false
    });
    clearTimeout(timer);
    const elapsedMs = Date.now() - started;
    const body = await response.text();
    const evidence = {
      url: response.url(),
      status: response.status(),
      elapsedMs,
      warningTriggered,
      serverError: response.status() >= 500
    };
    await attachJson(testInfo, 'probe-evidence.json', { ...evidence, headers: response.headers() });

    if (warningTriggered || evidence.serverError) {
      await attachText(testInfo, 'early-warning.txt',
        'SAFE ABORT SIGNAL\nFurther probing was intentionally stopped to avoid increasing target load.\n' +
        JSON.stringify(evidence, null, 2));
    }
    return { ...evidence, body, headers: response.headers() };
  } catch (error) {
    clearTimeout(timer);
    const evidence = {
      url: path,
      status: null,
      elapsedMs: Date.now() - started,
      warningTriggered: true,
      serverError: true,
      error: error instanceof Error ? error.message : String(error)
    };
    await attachJson(testInfo, 'probe-error.json', evidence);
    await attachText(testInfo, 'early-warning.txt',
      'SAFE ABORT SIGNAL\nRequest exceeded the safety timeout; no additional probes are started.\n' +
      JSON.stringify(evidence, null, 2));
    return { ...evidence, body: '', headers: {} };
  }
}

export async function guardedNavigation(page: Page, path: string, testInfo: TestInfo, options: { warningMs?: number; timeoutMs?: number } = {}) {
  const warningMs = options.warningMs ?? WARNING_MS;
  const timeoutMs = options.timeoutMs ?? HARD_TIMEOUT_MS;
  const started = Date.now();
  let warningTriggered = false;
  const timer = setTimeout(async () => {
    warningTriggered = true;
    await capturePageEvidence(page, testInfo, 'early-warning', {
      path,
      warningAfterMs: warningMs,
      elapsedMs: Date.now() - started,
      message: 'Navigation still pending; no further active probing will be started.'
    });
  }, warningMs);

  try {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    clearTimeout(timer);
    if (warningTriggered) {
      await capturePageEvidence(page, testInfo, 'post-warning', {
        path, elapsedMs: Date.now() - started, status: response?.status() ?? null
      });
    }
    return { response, elapsedMs: Date.now() - started, warningTriggered };
  } catch (error) {
    clearTimeout(timer);
    await capturePageEvidence(page, testInfo, 'navigation-failure', {
      path, elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export function finding(testInfo: TestInfo, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO', title: string, description: string, recommendation: string) {
  testInfo.annotations.push({
    type: 'security-finding',
    description: JSON.stringify({ severity, title, description, recommendation })
  });
}
