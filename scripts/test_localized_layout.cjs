/* Browser QA for every localized homepage and its guide.
 * Run after the Jekyll build: SITE_URL=http://127.0.0.1:8765 node scripts/test_localized_layout.cjs
 * Optionally set BEFORE_URL=https://bytewaveai.com to capture deployed baseline screenshots.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const SITE_URL = (process.env.SITE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const BEFORE_URL = (process.env.BEFORE_URL || '').replace(/\/$/, '');
const OUTPUT = path.resolve('qa-screenshots');
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
  await page.evaluate(() => document.fonts.ready);
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
    const target = document.querySelector('#motion-toggle');
    const button = rect(target);
    const video = document.querySelector('#ocean-motion');
    const videoDisplay = video ? getComputedStyle(video).display : '';
    const buttonFits = !target || width < 901 || target.hidden ||
      (!!button && button.bottom <= height + 1 && button.top >= 0 && button.right <= width + 1);
    return {
      lang, kind, requested:{width,height},
      actual:{width:innerWidth,height:innerHeight,clientWidth,scrollWidth},
      headerFits, logo:lr, menu:mr, cta:cr, ctaOverflow,
      emphasizedText:em?.textContent?.trim(),
      emphasizedInk, heroHeading:parentRect,
      emphasizedFits:!em || !emRange || !emRange.getClientRects().length ||
        [...emRange.getClientRects()].every(r => r.left >= -1 && r.right <= width + 1),
      cellOverflow:badCells,
      button, buttonFits, videoDisplay,
      canonical:document.querySelector('link[rel="canonical"]')?.href,
      alternates:[...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(x=>[x.hreflang,x.href]),
      store:cta?.href,
      mobileHasStaticImage:!!document.querySelector('.hero-photo img'),
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
  {id:'1440-desktop-pause', path:'/', size:sizes[0], selector:'hero'}
];
async function screenshots(browser, base, kind) {
  if (!base) return;
  const page = await browser.newPage();
  for (const s of scenarios) {
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
  const browser = await chromium.launch({headless:true, args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
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
        const data = await inspect(page, lang, size, 'after');
        const id = lang+' home '+viewportName(size);
        report(data.actual.width===size.width && data.actual.height===size.height, id+' exact viewport', {requested:size,actual:data.actual});
        report(data.headerFits, id+' header bounds', {logo:data.logo,menu:data.menu,cta:data.cta});
        report(data.emphasizedFits, id+' hero emphasis bounds', {text:data.emphasizedText, ink:data.emphasizedInk});
        if (size.width<=390) report(data.cellOverflow.length===0,id+' table cell bounds',{overflow:data.cellOverflow});
        if (size.width===1440) report(data.buttonFits,id+' pause button in viewport',{button:data.button});
        if (size.width<=390) report(data.videoDisplay==='none' && data.mobileHasStaticImage,id+' static mobile ocean',{videoDisplay:data.videoDisplay});
        if (size.width===1440) {
          const expected=SITE_URL+(slug?'/'+slug+'/':'/');
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
          report(data.canonical===SITE_URL+'/'+guide,lang+' guide self canonical',{canonical:data.canonical});
          report(data.alternates.length>=20 && data.alternates.find(a=>a[0]===lang)?.[1]===SITE_URL+'/'+guide,
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

    // Test playback, pause/resume, looping, reduced-motion preference.
    await ready(page,SITE_URL+'/');
    await page.setViewportSize(sizes[0]);
    const video=page.locator('#ocean-motion');
    await video.evaluate(v => {v.load();});
    await page.waitForFunction(() => document.querySelector('#ocean-motion').readyState>=1,{timeout:15000});
    const duration=await video.evaluate(v=>v.duration);
    report(duration>24 && duration<25,'full Cloud Glow video duration',{duration});
    await page.waitForTimeout(750);
    let state=await video.evaluate(v=>({paused:v.paused,currentTime:v.currentTime,loop:v.loop}));
    report(!state.paused && state.loop,'desktop muted autoplay and looping enabled',state);
    await page.locator('#motion-toggle').click();
    state=await video.evaluate(v=>({paused:v.paused,currentTime:v.currentTime}));
    report(state.paused,'desktop pause button stops playback',state);
    await page.locator('#motion-toggle').click();
    await page.waitForTimeout(250);
    state=await video.evaluate(v=>({paused:v.paused,currentTime:v.currentTime}));
    report(!state.paused,'desktop play button resumes playback',state);
    await video.evaluate(v => {v.currentTime=v.duration-0.16;});
    await page.waitForTimeout(550);
    state=await video.evaluate(v=>({paused:v.paused,currentTime:v.currentTime,loop:v.loop}));
    report(state.loop && !state.paused && state.currentTime<2,'Cloud Glow returns to start after looping',state);
    const reduced=await browser.newPage({viewport:sizes[0],reducedMotion:'reduce'});
    await ready(reduced,SITE_URL+'/');
    const noMotion=await reduced.locator('#ocean-motion').evaluate(v=>({paused:v.paused,src:v.getAttribute('src')}));
    report(noMotion.paused,'reduced motion does not autoplay ocean video',noMotion);
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
