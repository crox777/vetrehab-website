const { chromium } = require('playwright');

// usage: node shot.js <tag> <page1,page2,...>
const tag = process.argv[2] || 'x';
const pages = (process.argv[3] || 'index.html').split(',');
const OUT = '/Users/reneangel/vetrehab-website/shots';
const BASE = 'http://localhost:8899/';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor || 1,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.isMobile,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    for (const p of pages) {
      const slug = p.replace('.html', '');
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
      await page.waitForTimeout(500);
      const file = `${OUT}/${tag}-${slug}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    await ctx.close();
  }
  await browser.close();
})();
