/* Browser QA for every localized homepage and its guide.
 * Run after the Jekyll build: SITE_URL=http://127.0.0.1:8765 node scripts/test_localized_layout.cjs
 * Set QA_SCOPE=smoke for English, French and Japanese; defaults to the full suite.
 * Optionally set BEFORE_URL=https://bytewaveai.com to capture deployed baseline screenshots.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const SITE_URL = (process.env.SITE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const BEFORE_URL = (process.env.BEFORE_URL || '').replace(/\/$/, '');
const OUTPUT = path.resolve('qa-screenshots');
const CANONICAL_URL = 'https://bytewaveai.com';
const sizes = [{width: 1440, height: 900}, {width: 390, height: 844}, {width: 320, height: 844}];
const locales = [
  ['en', '', 'blog/best-video-editor-privacy-no-upload.html'],
  ['es', 'es', 'es/blog/editor-de-video-sin-subir-archivos.html'],
  ['fr', 'fr', 'fr/blog/editeur-video-prive-sans-cloud.html'],
  ['de', 'de', 'de/blog/videoeditor-ohne-cloud-upload.html'],
  ['it', 'it', 'it/blog/editor-video-privato-senza-cloud.html'],
  ['nl', 'nl', 'nl/blog/video-bewerken-zonder-cloud.html'],
  ['pt-PT', 'pt', 'pt/blog/editor-video-sem-nuvem.html'],
  ['pt-BR', 'pt-br', 'pt-br/blog/editor-video-privado-sem-nuvem.html'],
  ['sv', 'sv', 'sv/blog/privat-video-utan-moln.html'],
  ['no', 'no', 'no/blog/privat-video-uten-nettsky.html'],
  ['fi', 'fi', 'fi/blog/yksityinen-videoeditori-ilman-pilvea.html'],
  ['pl', 'pl', 'pl/blog/prywatny-edytor-wideo-bez-chmury.html'],
  ['tr', 'tr', 'tr/blog/buluta-yuklemeden-video-duzenleme.html'],
  ['uk', 'uk', 'uk/blog/pryvatnyi-videoredaktor-bez-khmary.html'],
  ['ja', 'ja', 'ja/blog/private-video-editor-without-cloud.html'],
  ['ko', 'ko', 'ko/blog/private-video-editing-without-cloud.html'],
  ['zh-Hant', 'zh-hant', 'zh-hant/blog/private-video-editor-no-cloud.html']
];
// Retain desktop and both mobile widths in the routine smoke test.
if (process.env.QA_SCOPE === 'smoke') {
  const sample = locales.filter(([lang]) => ['en', 'fr', 'ja'].includes(lang));
  locales.splice(0, locales.length, ...sample);
}
const errors = [], results = [], warnings = [];
const capture = (kind, name) => path.join(OUTPUT, kind, name + '.png');
for (const kind of ['before', 'after']) fs.mkdirSync(path.join(OUTPUT, kind), {recursive: true});

const viewportName = ({width, height}) => width + 'x' + height;
const rect = element => {
  if (!element) return null;
  const r = element.getBoundingClientRect();
  return {x:r.x, y:r.y, left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height};
};
function report(ok, message, details) {
  results.push({ok, message, ...details});
  if (!ok) errors.push({message, ...details});
}
async function ready(page, address) {
  await page.goto(address, {waitUntil: 'domcontentloaded', timeout: 35000});
  await page.evaluate(async () => {
    await document.fonts.ready;
    const image = document.querySelector('.hero-photo img');
    if (image) await image.decode().catch(() => {});
  });
}
async function inspect(page, lang, size, kind) {
  return page.evaluate(({lang, width, height, kind}) => {
    const rect = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height};
    };
    const html = document.documentElement;
    const nav = document.querySelector('.site-nav');
    const logo = nav?.querySelector('.site-logo');
    const menu = nav?.querySelector('.site-menu > summary');
    const cta = nav?.querySelector('.site-download');
    const em = document.querySelector('.hero h1 em');
    const emRange = document.createRange();
    if (em) emRange.selectNodeContents(em);
    const emphasizedInk = em ? rect(emRange.getBoundingClientRect ? emRange : em) : null;
    const parentRect = em ? rect(em.closest('h1')) : null;
    const table = document.querySelector('#compare table');
    const badCells = [];
    if (table && width <= 390) {
      table.querySelectorAll('th, td').forEach((cell, index) => {
        const box = cell.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(cell);
        let overflow = false;
        for (const r of range.getClientRects()) {
          if (r.width && (r.left < box.left - 1.6 || r.right > box.right + 1.6)) overflow = true;
        }
        for (const inside of cell.querySelectorAll('.price-free, .price-paid')) {
          const b = inside.getBoundingClientRect();
          if (b.left < box.left - 1.6 || b.right > box.right + 1.6) overflow = true;
        }
        if (overflow) badCells.push({cell:index, text:cell.textContent.trim().slice(0,100), bounds:rect(cell)});
      });
    }
    const {scrollWidth,clientWidth} = html;
    const ctaOverflow = cta ? cta.scrollWidth > cta.clientWidth + 1 : null;
    const small = width <= 960;
    const lr = rect(logo), mr = rect(menu), cr = rect(cta);
    const headerFits = !small || (!!lr && !!mr && !!cr &&
      lr.left >= -1 && lr.right <= width + 1 &&
      mr.left >= -1 && mr.right <= width + 1 &&
      cr.left >= -1 && cr.right <= width + 1 &&
      lr.right <= mr.left + 1 && mr.right <= cr.left + 1 &&
      mr.height >= 44 && cr.height >= 44 && !ctaOverflow);
    const image = document.querySelector('.hero-photo img');
    return {
      lang, kind, requested:{width,height},
      actual:{width:innerWidth,height:innerHeight,clientWidth,scrollWidth},
      headerFits, logo:lr, menu:mr, cta:cr, ctaOverflow,
      emphasizedText:em?.textContent?.trim(),
      emphasizedInk, heroHeading:parentRect,
      emphasizedFits:!em || !emRange || !emRange.getClientRects().length ||
        [...emRange.getClientRects()].every(r => r.left >= 1 && r.right <= width - 1),
      emphasisOnOneLine:!em || [...emRange.getClientRects()].length === 1,
      cellOverflow:badCells,
      staticSunrise: !!image && image.complete && image.naturalWidth > 0 &&
        image.currentSrc.includes('/golden-sunrise/sunrise-') &&
        !document.querySelector('.hero video, #motion-toggle'),
      canonical:document.querySelector('link[rel="canonical"]')?.href,
      alternates:[...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(x=>[x.hreflang,x.href]),
      store:cta?.href,
      headingHeight:rect(document.querySelector('.hero'))?.height
    };
  }, {lang, width:size.width, height:size.height, kind});
}
const scenarios = [
  {id:'pl-390-hero', path:'/pl/', size:sizes[1], selector:'hero'},
  {id:'pl-320-hero', path:'/pl/', size:sizes[2], selector:'hero'},
  {id:'uk-390-header', path:'/uk/', size:sizes[1], selector:'header'},
  {id:'uk-320-header', path:'/uk/', size:sizes[2], selector:'header'},
  {id:'de-320-table', path:'/de/#compare', size:sizes[2], selector:'table'},
  {id:'de-320-data-handling-row', path:'/de/#compare', size:sizes[2], selector:'data'},
  {id:'no-390-table', path:'/no/#compare', size:sizes[1], selector:'table'},
  {id:'sv-390-table', path:'/sv/#compare', size:sizes[1], selector:'table'},
  {id:'ja-320-hero', path:'/ja/', size:sizes[2], selector:'hero'},
  {id:'ko-320-hero', path:'/ko/', size:sizes[2], selector:'hero'},
  {id:'1440-desktop-sunrise', path:'/', size:sizes[0], selector:'hero'}
];
async function screenshots(browser, base, kind) {
  if (!base) return;
  const page = await browser.newPage();
  for (const s of scenarios) {
    if (process.env.QA_SCOPE === 'smoke' && !['/', '/ja/'].includes(s.path)) continue;
    try {
      await page.setViewportSize(s.size);
      await ready(page, base + s.path);
      if (s.selector === 'table') await page.locator('#compare').scrollIntoViewIfNeeded();
      if (s.selector === 'data') await page.locator('#compare tbody tr').nth(3).scrollIntoViewIfNeeded();
      await page.screenshot({path:capture(kind,s.id), animations:'disabled'});
      if (s.selector === 'data') {
        await page.locator('#compare tbody tr').nth(3).screenshot({path:capture(kind,s.id+'-detail'), animations:'disabled'});
      }
    } catch (e) {
      const message = kind+' screenshot '+s.id+': '+e.message;
      if (kind === 'before') warnings.push(message);
      else errors.push({message});
    }
  }
  await page.close();
}
(async () => {
  // Google Chrome includes H.264 decoding; Playwright's bundled Chromium may not.
  const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']
    .find(candidate => fs.existsSync(candidate));
  console.log('Browser executable:', chrome || 'Playwright Chromium (H.264 may be unavailable)');
  const browser = await chromium.launch({
    headless:true, ...(chrome ? {executablePath:chrome} : {}),
    args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']
  });
  try {
    await screenshots(browser, BEFORE_URL, 'before');
    await screenshots(browser, SITE_URL, 'after');

    const page = await browser.newPage();
    for (const [lang, slug, guide] of locales) {
      const home = SITE_URL + (slug ? '/'+slug+'/' : '/');
      await page.setViewportSize(sizes[0]);
      await ready(page, home);
      for (const size of sizes) {
        await page.setViewportSize(size);
        // Decode the responsive candidate before asserting its availability.
        await page.locator('.hero-photo img').evaluate(img => img.decode().catch(() => {}));
        const data = await inspect(page, lang, size, 'after');
        const id = lang+' home '+viewportName(size);
        report(data.actual.width===size.width && data.actual.height===size.height, id+' exact viewport', {requested:size,actual:data.actual});
        report(data.headerFits, id+' header bounds', {logo:data.logo,menu:data.menu,cta:data.cta});
        report(data.emphasizedFits, id+' hero emphasis viewport bounds', {text:data.emphasizedText, ink:data.emphasizedInk});
        if (size.width <= 390 && ['pl','pt-PT','uk','ja','ko','zh-Hant'].includes(lang)) {
          report(data.emphasisOnOneLine, id+' keeps emphasized phrase together',{text:data.emphasizedText});
        }
        if (size.width<=390) report(data.cellOverflow.length===0,id+' table cell bounds',{overflow:data.cellOverflow});
        report(data.staticSunrise,id+' golden sunrise loaded without background video controls');
        if (size.width===1440) {
          const expected=CANONICAL_URL+(slug?'/'+slug+'/':'/');
          report(data.canonical===expected,id+' self canonical',{canonical:data.canonical});
          report(data.alternates.length>=20 && data.alternates.find(a=>a[0]===lang)?.[1]===expected,
            id+' hreflang',{count:data.alternates.length});
        }
      }
      // The guide shares the header and must preserve reciprocal localized URLs.
      await ready(page,SITE_URL+'/'+guide);
      for (const size of sizes.slice(1)) {
        await page.setViewportSize(size);
        const data=await inspect(page,lang,size,'guide');
        report(data.headerFits,lang+' guide '+viewportName(size)+' header bounds',{logo:data.logo,menu:data.menu,cta:data.cta});
        if (size.width===390) {
          report(data.canonical===CANONICAL_URL+'/'+guide,lang+' guide self canonical',{canonical:data.canonical});
          report(data.alternates.length>=20 && data.alternates.find(a=>a[0]===lang)?.[1]===CANONICAL_URL+'/'+guide,
            lang+' guide hreflang',{count:data.alternates.length});
        }
      }
    }

    // Exercise a desktop language dropdown, the mobile menu, and guide-to-guide switching.
    await page.setViewportSize(sizes[0]);
    await ready(page,SITE_URL+'/es/');
    await page.locator('.site-language > summary').click();
    report(await page.locator('.site-language[open] a[href="/ja/"]').isVisible(),'desktop globe menu exposes Japanese');
    await page.locator('.site-language[open] a[href="/ja/"]').click();
    report(page.url().endsWith('/ja/'),'desktop globe switches to Japanese',{url:page.url()});

    await page.setViewportSize(sizes[2]);
    await ready(page,SITE_URL+'/uk/');
    await page.locator('.site-menu > summary').click();
    report(await page.locator('.site-menu[open] a[href="/ko/"]').isVisible(),'mobile menu exposes Korean');
    await page.locator('.site-menu[open] a[href="/ko/"]').click();
    report(page.url().endsWith('/ko/'),'mobile menu switches to Korean',{url:page.url()});

    await page.setViewportSize(sizes[0]);
    await ready(page,SITE_URL+'/es/blog/editor-de-video-sin-subir-archivos.html');
    await page.locator('.site-language > summary').click();
    await page.locator('.site-language[open] a[href="/ja/blog/private-video-editor-without-cloud.html"]').click();
    report(page.url().endsWith('/ja/blog/private-video-editor-without-cloud.html'),
      'Spanish guide switch opens equivalent Japanese guide',{url:page.url()});

    // The English header and final CTA share a country-neutral App Store URL.
    await ready(page,SITE_URL+'/');
    const store=await page.evaluate(() => ({
      header:document.querySelector('.site-nav .site-download')?.href,
      footer:document.querySelector('.cta-section .btn-primary')?.href,
      hero:document.querySelector('.hero-actions .btn-primary')?.href
    }));
    const neutral=u=>u && u.includes('/app/apple-store/id6752225642') && !u.includes('/us/') &&
      u.includes('pt=126768479') && u.includes('ct=');
    report(neutral(store.header)&&neutral(store.footer)&&neutral(store.hero),
      'English App Store URLs are country-neutral and preserve campaign tracking',store);

    // Verify corrected copy is actually rendered in the feature card and provenance row.
    await ready(page,SITE_URL+'/pt-br/');
    const portuguese=await page.evaluate(() => ({
      feature:document.querySelector('.feature-item')?.textContent||'',
      compare:[...document.querySelectorAll('.comp-table tbody tr')].find(tr=>tr.textContent.includes('Proveniência'))?.textContent||''
    }));
    report(portuguese.feature.includes('detectar alterações') && portuguese.compare.includes('Selo do ByteWave ao salvar no app Fotos'),
      'Brazilian Portuguese corrections rendered',portuguese);

    // The 4K viewport must receive the full-size still, with no old video requests.
    const wide=await browser.newPage({viewport:{width:3840,height:2160},deviceScaleFactor:1});
    const backgroundRequests=[];
    wide.on('request',request=>{
      if (/cloud-glow\.(mp4|webp)|hero-motion\.(js|css)/.test(request.url())) backgroundRequests.push(request.url());
    });
    await ready(wide,SITE_URL+'/');
    const fullSize=await wide.locator('.hero-photo img').evaluate(img=>({src:img.currentSrc,loaded:img.complete && img.naturalWidth>0}));
    report(fullSize.loaded && fullSize.src.endsWith('/sunrise-3840.webp'),'4K screen loads the 3840-pixel sunrise',fullSize);
    report(backgroundRequests.length===0,'no former background video or motion assets requested',{backgroundRequests});
    await wide.close();

    const reduced=await browser.newPage({viewport:sizes[0],reducedMotion:'reduce'});
    await ready(reduced,SITE_URL+'/');
    const noMotion=await inspect(reduced,'en',sizes[0],'reduced-motion');
    report(noMotion.staticSunrise,'reduced motion retains the golden sunrise without background video');
    await reduced.close();

    await page.close();
  } finally {
    await browser.close();
    const summary={site:SITE_URL,baseline:BEFORE_URL,viewportSizes:sizes,locales:locales.map(x=>x[0]),
      homePages:locales.length,guidePages:locales.length,assertions:results.length,failures:errors.length,errors,warnings,
      results};
    fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(summary,null,2));
    console.log('VISUAL QA '+JSON.stringify({homePages:locales.length,guidePages:locales.length,
      viewportSizes:sizes,assertions:results.length,failures:errors.length,warningCount:warnings.length}));
    if(errors.length) console.error('QA FAILURES\n'+JSON.stringify(errors.slice(0,60),null,2));
    if(warnings.length) console.warn('QA WARNINGS\n'+JSON.stringify(warnings.slice(0,15),null,2));
  }
  if(errors.length) process.exitCode=1;
})().catch(e=>{console.error('QA ERROR',e); process.exitCode=1;});
