const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const baseUrl = 'https://innerplay-gemini-443171020325.us-central1.run.app/play?story=the-call';
  const audioPath = path.resolve('output/playwright/fake-user.wav');
  const screenshotPath = path.resolve('output/playwright/live-fake-mic-after-fix.png');
  const logPath = path.resolve('output/playwright/live-fake-mic-after-fix-log.txt');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${audioPath}`,
    ],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await context.grantPermissions(['microphone'], { origin: 'https://innerplay-gemini-443171020325.us-central1.run.app' });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  logs.push(`[meta] url=${page.url()}`);

  const skipButton = page.getByRole('button', { name: /skip intro/i });
  await skipButton.waitFor({ state: 'visible', timeout: 30000 });
  await skipButton.click();
  logs.push('[action] clicked skip intro');

  await page.waitForTimeout(28000);

  const bodyText = await page.locator('body').innerText();
  logs.push('[body] ' + bodyText.replace(/\s+/g, ' ').slice(0, 1500));

  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(logPath, logs.join('\n'), 'utf8');

  console.log(`screenshot=${screenshotPath}`);
  console.log(`log=${logPath}`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
