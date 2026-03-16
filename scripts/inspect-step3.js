// Quick inspector: dump Select2 options for arch diagram and country fields
const { chromium } = require('playwright');

const COOKIES = [
  { domain: '.devpost.com', name: '_devpost', value: 'VE9heWRzcllvbkJrSFpQSHdldStjZWVKWkRqYUdBQlprTmg0L0kvdTRQK0R0T1RCcE5GZ25ITVFQY1JjZWFnbkVoclYwUnNqR1Q1VFd5MHI3bXN6MFdOZy9UU1V1OVp2U3E1Y2tkRVUvMnhWTmw4ZHArQzdxU1l1b1JYb005K1lxeHEyWGlUQ1ROUHVkMjNjb05iTzd5RzN0MHhtWWYxVnQ1WU5wMFhKZFVJMDFLQzdkRTVvUVg3ZFRQaFA0d3hDbVVSbXRqcm1ZVTNpNTJUYVhTY0E3aHZva1JjbVRnRTRQY0FSSjhrQUxjMUN6ZjNDTVlIeWJ6UVdsSGxKa240b0cxZlY0TmpsT1Y2VDMxeVBYNDZBOHYxcDBZU0oyV09NOEU2Vjg3STZvTVVxYXNGcjB3Y0k0dmxiWHhQUG5BUklkZTZ3d2Y0Q2JiMGw2WVZ4bHlFTkVhV0RXaHBTSGVJekZuMlVwV1BIbnVPZG9iSEZDNzM4Nm5ES2ZBT1ZVVGJNdUF6eGZCR05lUHFmcjVHZkR1R0kwZXA0aGhOeGIvREE2Y2VWY3Bma3V6Q25SRVRMWktEelNKOWlHc09kanlTd1UwakcyQWl1aDdUTUJtaGdqZVdTR2JHQlhYUzJyVWk2MzR0YlpkN3puR056YzRoc3E3dGtmQ0JmUjllSFlvckpXNlM0c0k2RjR2NGIxWEp6N3dGSnVPWGRhdmxSMzkrc1ppc01CcVpmOG5sRnFORFU5aG11UEJDa0VBSkN4QklKb1NpTkxMbSsyWlhUaUVHZlVMNERPZz09LS1OaDlCNFlkcXdvZXp0Z2FDSUgvajRRPT0%3D--68938dca84413514a0b8ca7f0ce8eecf5eb04b30', path: '/', httpOnly: true, secure: true },
  { domain: '.devpost.com', name: 'jwt', value: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTAyMTMyNDF9.1QYh7mVG_EOY4rH26nbbd9KDI-8Yqh54Mc6cZ3ow0qY', path: '/', httpOnly: true, secure: true },
  { domain: '.devpost.com', name: 'remember_user_token', value: 'W1sxMDIxMzI0MV0sIk14d1JwbXhYVkdzWG16cWFmVDg5IiwiMTc3MzU5Nzg0MS4wMjMzNDk1Il0%3D--f317e70d22336554423b72a598e2d556d094bf18', path: '/', httpOnly: true, secure: true },
  { domain: 'devpost.com', name: 'AWSALB', value: 'dFPxE2i0gacXpp89vfcpUK3oeeNHhWUc3M92rhXds5sNL1ut6nnLdz0Xkhlo0dw9Pfdf51zsuorwtxwffv6DiGmHiTd4NRMe89G3+NKzMrLrs3/MERAEp6hL5byh', path: '/', httpOnly: false, secure: false },
  { domain: 'devpost.com', name: 'AWSALBCORS', value: 'dFPxE2i0gacXpp89vfcpUK3oeeNHhWUc3M92rhXds5sNL1ut6nnLdz0Xkhlo0dw9Pfdf51zsuorwtxwffv6DiGmHiTd4NRMe89G3+NKzMrLrs3/MERAEp6hL5byh', path: '/', httpOnly: false, secure: true },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(COOKIES.map(c => ({ ...c, sameSite: 'Lax' })));
  const page = await ctx.newPage();

  await page.goto('https://devpost.com/submit-to/28633-gemini-live-agent-challenge/manage/submissions/951748-innerplay/additional-info/edit', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  // Dump all <select> options on the page
  const selects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select')).map(sel => ({
      id: sel.id,
      name: sel.name,
      options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
  });
  console.log('=== All <select> options ===');
  selects.forEach(s => {
    console.log(`\nSelect: #${s.id} name="${s.name}"`);
    s.options.forEach(o => console.log(`  "${o.text}" (value="${o.value}")`));
  });

  // Dump all hidden <select> that Select2 wraps (multi-selects)
  const multiSelects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[multiple]')).map(sel => ({
      id: sel.id, name: sel.name,
      options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
  });
  console.log('\n=== Multi-selects (Select2 wrappers) ===');
  multiSelects.forEach(s => {
    console.log(`\nMultiSelect: #${s.id} name="${s.name}"`);
    s.options.forEach(o => console.log(`  "${o.text}" (value="${o.value}")`));
  });

  await browser.close();
})();
