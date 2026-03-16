const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const baseUrl = 'http://127.0.0.1:3012/play?story=the-call';
  const screenshotPath = path.resolve('output/playwright/local-entry.png');
  const logPath = path.resolve('output/playwright/local-entry-log.txt');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const logs = [];
  page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  logs.push('[url] ' + page.url());
  logs.push('[body] ' + (await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,1500));
  const buttons = await page.locator('button').evaluateAll((els) => els.map((el) => el.textContent));
  logs.push('[buttons] ' + JSON.stringify(buttons));
  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(logPath, logs.join('\n'), 'utf8');
  console.log(`screenshot=${screenshotPath}`);
  console.log(`log=${logPath}`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
