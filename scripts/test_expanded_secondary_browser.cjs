/* Browser checks for additional company, policy, press, gallery and blog pages. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const languages = JSON.parse(fs.readFileSync(path.join(root, '_data/expanded_languages.json'), 'utf8'));
const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
const footerRoutes = ['about.html', 'privacy.html', 'free-expression.html', 'press.html', 'gallery/'];
const routes = [...footerRoutes, 'blog/google-schools-ai-search-access.html'];
const mobileSamples = new Set(['ar', 'cs', 'km', 'th', 'vi']);
const output = path.join(root, 'qa-secondary/expanded');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.route(/\.(?:mp4|m3u8|ts)(?:\?|$)/, route => route.abort());
  let checked = 0;
  try {
    for (const lang of languages) {
      for (const width of mobileSamples.has(lang) ? [1440, 390, 320] : [1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          const url = `${base}/${lang}/${route}`;
          const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
          assert.equal(response.status(), 200, url);
          const state = await page.evaluate(() => ({
            lang: document.documentElement.lang,
            direction: getComputedStyle(document.documentElement).direction,
            overflow: document.documentElement.scrollWidth - innerWidth,
            headings: [...document.querySelectorAll('main h1, main h2')].map(el => el.textContent.trim()),
            mainCount: document.querySelectorAll('main').length,
            h1Count: document.querySelectorAll('h1').length,
            alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(el => el.hreflang),
            footer: [...document.querySelectorAll('footer a')].map(el => new URL(el.href).pathname),
          }));
          assert.equal(state.lang, lang, url);
          assert.equal(state.direction, lang === 'ar' ? 'rtl' : 'ltr', url);
          assert.ok(state.overflow <= 1, `${url} overflows ${state.overflow}px at ${width}px`);
          assert.equal(state.mainCount, 1, url);
          assert.equal(state.h1Count, 1, url);
          assert.ok(state.headings.every(Boolean), `${url}: empty heading`);
          assert.ok(languages.every(code => state.alternates.includes(code)), `${url}: alternates`);
          for (const destination of footerRoutes) assert.ok(state.footer.includes(`/${lang}/${destination}`), `${url}: ${destination}`);
          if (route === 'press.html') {
            assert.equal(await page.locator('button.copy').count(), 4, url);
            await page.locator('button.copy').first().click();
            const expected = (await page.locator('[data-copy]').first().innerText()).trim();
            await page.waitForFunction(expected => navigator.clipboard.readText().then(text => text === expected), expected);
          }
          if (route === 'gallery/') {
            assert.equal(await page.locator('main video[data-bw-labels]').count(), 13, url);
            assert.equal(await page.locator('main figcaption').count(), 13, url);
          }
          if (width === 390 && ['press.html', 'gallery/', 'blog/google-schools-ai-search-access.html'].includes(route)) {
            await page.screenshot({ path: path.join(output, `${lang}-${route.replace(/[^a-z]/g, '-')}.png`), fullPage: true });
          }
          checked++;
        }
      }
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ pagesAndViewports: checked, languages: languages.length }, null, 2));
    console.log(`Validated ${checked} page/viewports across ${languages.length} added locales, including RTL, navigation and press copying.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
