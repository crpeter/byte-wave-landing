/* Browser smoke test for translated secondary pages. Browser screenshots are real renders. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ORIGIN = (process.env.SITE_URL || 'http://127.0.0.1:8765').replace(/\/$/,'');
const DOMAIN = 'https://bytewaveai.com';
const OUT = path.resolve('qa-secondary');
fs.mkdirSync(OUT, {recursive:true});
const locales = [
 ['es','es'], ['fr','fr'], ['de','de'], ['it','it'], ['nl','nl'],
 ['pt-PT','pt'], ['pt-BR','pt-br'], ['sv','sv'], ['no','no'], ['fi','fi'],
 ['pl','pl'], ['tr','tr'], ['uk','uk'], ['ja','ja'], ['ko','ko'], ['zh-Hant','zh-hant']
];
const routes = [
 ['about','about.html'], ['press','press.html'], ['blog','blog/'], ['free-expression','free-expression.html'],
 ['privacy','privacy.html'], ['tutorials','tutorials/'], ['gallery','gallery/'], ['layout','layout/'],
 ['filters','blog/when-ai-filters-change-what-happened.html'],
 ['labels','blog/facebook-ai-labels-filters-generated-images.html'],
 ['missing-label','blog/no-ai-label-does-not-mean-real.html'],
 ['metadata-labels','blog/does-removing-metadata-remove-ai-labels.html'],
 ['c2pa','tutorials/check-c2pa-content-credentials/'],
 ['metadata','tutorials/remove-location-metadata/'],
 ['motion','tutorials/motion-blur/'],
 ['frc','tutorials/frame-rate-conversion/'],
 ['noise','tutorials/temporal-noise-reduction/']
];
const issues=[], checks=[];
function test(ok, label, result) {
 checks.push({ok, label, ...(result ? {result}: {})});
 if (!ok) issues.push({label,result});
}
(async () => {
 const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(file => fs.existsSync(file));
 const browser = await chromium.launch({headless:true, executablePath:chrome, args:['--no-sandbox']});
 const page = await browser.newPage();
 try {
  await page.context().grantPermissions(['clipboard-read','clipboard-write'], {origin:ORIGIN});
  for (const [lang, slug] of locales) {
   for (const [kind, route] of routes) {
    for (const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:844}]) {
     await page.setViewportSize(size);
     const url = ORIGIN+'/'+slug+'/'+route;
     const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
     await page.evaluate(() => document.fonts.ready);
     const data=await page.evaluate(({width,height})=>{
      const nav=document.querySelector('.site-nav');
      const logo=nav?.querySelector('.site-logo');
      const cta=nav?.querySelector('.site-download');
      const trigger=nav?.querySelector('.site-menu summary');
      const bounds = el => {if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}};
      const all=[logo,cta,trigger].map(bounds);
      const cards=[...document.querySelectorAll('.tutorial-card')];
      const media=[...document.querySelectorAll('.gallery-grid video')];
      const html=document.documentElement;
      return {
       viewport:[innerWidth,innerHeight], lang:html.lang, heading:document.querySelector('h1')?.textContent.trim(),
       canonical:document.querySelector('link[rel="canonical"]')?.href,
       hreflangs:[...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(l=>[l.hreflang,l.href]),
       menu:all[2],logo:all[0],cta:all[1],ctaText:cta?.textContent.trim(),
       docWidth:html.scrollWidth,viewWidth:html.clientWidth,
       overflowingElements:[...document.body.querySelectorAll('*')]
         .map(el=>{
           const r=el.getBoundingClientRect(),range=document.createRange();
           range.selectNodeContents(el);
           const ink=range.getBoundingClientRect();
           return {tag:el.tagName.toLowerCase(),className:typeof el.className==='string'?el.className.slice(0,90):'',
             text:(el.textContent||'').trim().slice(0,95),
             left:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,
             inkRight:Math.round(ink.right*10)/10,
             scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
         })
         .filter(x=>x.scrollWidth>x.clientWidth+1 ||
           x.right>width+1 || x.inkRight>width+1)
         .sort((a,b)=>Math.max(b.inkRight-width,b.scrollWidth-b.clientWidth,b.right-width)-
                       Math.max(a.inkRight-width,a.scrollWidth-a.clientWidth,a.right-width))
         .slice(0,22),
       tutorialCards:cards.length,galleryVideos:media.length,
       mediaLabels:media.filter(v=>v.hasAttribute('data-bw-labels')).length,
       brokenCardBounds:cards.map((e,i)=>({r:e.getBoundingClientRect(),i})).filter(x=>x.r.left<-1||x.r.right>width+1).map(x=>x.i),
       missingPoster:media.filter(v=>!v.getAttribute('poster')).length,
       hasAppeal:!!document.querySelector('#appeal'),
       firstAlt:[...document.querySelectorAll('.gallery-grid video')].every(v=>!!v.getAttribute('aria-label')),
       visibleLangNav:!!document.querySelector('.site-language'),
       bodyLength:document.querySelector('main')?.textContent.trim().length,
       downloadURL:cta?.href,
       instructionSteps:document.querySelectorAll('main article ol > li').length,
       verificationRows:document.querySelectorAll('main article tbody tr').length,
       hasC2paSpec:!!document.querySelector('a[href*="spec.c2pa.org/specifications"]'),
       hasIrishRegulator:!!document.querySelector('a[href*="dataprotection.ie/en/news-media/latest-news"]'),
       hasOriginalAssessment:document.querySelector('main')?.textContent.includes('Recorded at import'),
       hasSignedCredentials:document.querySelector('main')?.textContent.includes('Content Credentials'),
       comparisonVideo:(()=>{
         const player=document.querySelector('main .bw-player');
         const video=player?.querySelector('video[data-bw-player]');
         const bb=video?.getBoundingClientRect();
         const region=document.querySelector('main article')?.getBoundingClientRect();
         return {
           src:video?.querySelector('source')?.getAttribute('src'),
           poster:video?.getAttribute('poster'),
           id:video?.id, width:video?.getAttribute('width'),height:video?.getAttribute('height'),
           hasNativeControls:video?.hasAttribute('controls'), playsinline:video?.hasAttribute('playsinline'),
           hasPlayButton:!!player?.querySelector('.bw-play[aria-controls="'+video?.id+'"]'),
           hasStatus:!!player?.querySelector('.bw-video-status[role="status"]'),
           hasCaption:!!document.querySelector('#comparison-description'),
           withinBounds:!bb||!region ? false : bb.left>=Math.max(0,region.left)-2&&bb.right<=Math.min(width,region.right)+2,
           hasAlt:!!video?.getAttribute('aria-label')
         };
       })()
      };
     },size);
     const key=lang+' '+kind+' '+size.width+'x'+size.height;
     const canonical=DOMAIN+'/'+slug+'/'+route;
     test(response?.status()===200,key+' responds 200',{status:response?.status()});
     test(data.viewport[0]===size.width&&data.viewport[1]===size.height,key+' actual viewport',data.viewport);
     test(data.lang===lang,key+' language attribute',data.lang);
     test(data.canonical===canonical,key+' self canonical',data.canonical);
     test(data.hreflangs.length>=20 && data.hreflangs.some(v=>v[0]===lang&&v[1]===canonical),key+' reciprocal alternates',{count:data.hreflangs.length});
     test(!!data.heading && data.bodyLength>150,key+' visible translated content',{heading:data.heading,length:data.bodyLength});
     test(data.docWidth<=data.viewWidth+1,key+' no page-level horizontal overflow',{scroll:data.docWidth,client:data.viewWidth,offenders:data.overflowingElements});
     if (size.width<=390){
      test(!!data.logo&&!!data.menu&&!!data.cta &&
           data.logo.left>=-1&&data.cta.right<=size.width+1 &&
           data.menu.height>=44&&data.cta.height>=44,
        key+' mobile header usable',{logo:data.logo,menu:data.menu,cta:data.cta});
     }
     if(kind==='blog'){
      const broken = await page.locator('main .post-card').evaluateAll(cards => cards.filter(card => {
       const bounds = card.getBoundingClientRect();
       const label = card.querySelector('.article-language');
       return bounds.left < -1 || bounds.right > innerWidth + 1 || !bounds.height ||
        (card.hreflang === 'en' && !label?.getBoundingClientRect().height);
      }).map(card => card.getAttribute('href')));
      test(!broken.length,key+' article cards fit and English destinations have visible labels',broken);
     }
     if(kind==='press'){
      const facts=await page.locator('#facts .fact-row').count();
      const copyBlocks=page.locator('.block:has(button.copy)');
      test(facts===9 && await copyBlocks.count()===4 && await page.locator('#angles .angle').count()===3,
           key+' complete fact sheet, four copy blocks and three story angles');
      const clipped=await page.locator('main h1, .fact-value, .block [data-copy], .asset-dl').evaluateAll(elements =>
       elements.filter(el => el.getBoundingClientRect().width === 0 || el.scrollWidth > el.clientWidth + 1 ||
        el.getBoundingClientRect().right > innerWidth + 1).map(el => el.textContent.slice(0,80)));
      test(clipped.length===0,key+' press text and download controls fit the viewport',clipped);
      if(size.width===390){
       for(const block of await copyBlocks.all()){
        const expected=(await block.locator('[data-copy]').innerText()).trim();
        await block.locator('.copy').click();
        await block.locator('.copy[data-done="1"]').waitFor();
        const copied=await page.evaluate(()=>navigator.clipboard.readText());
        test(copied===expected,key+' copy button writes the corresponding localized text');
       }
      }
     }
     if(kind==='tutorials'){
      test(data.tutorialCards===10&&data.brokenCardBounds.length===0,key+' ten readable tutorial cards',{count:data.tutorialCards,overflow:data.brokenCardBounds});
     }
     if(kind==='gallery'){
      test(data.galleryVideos===13&&data.mediaLabels===13&&data.missingPoster===0&&data.firstAlt,key+' thirteen intact localized video players',
       {videoCount:data.galleryVideos,labels:data.mediaLabels,missingPosters:data.missingPoster});
     }
     if(kind==='layout'){
      const players = await page.locator('main figure video').evaluateAll(videos => videos.map(video => {
       const frame = video.getBoundingClientRect();
       const figure = video.closest('figure');
       const play = figure.querySelector('.bw-play[aria-controls="' + video.id + '"]');
       return frame.width > 0 && frame.left >= -1 && frame.right <= document.documentElement.clientWidth + 1
        && video.playsInline && video.querySelectorAll('source').length === 2
        && !!play && !play.hidden && !play.disabled
        && play.getAttribute('aria-label') === JSON.parse(video.dataset.bwLabels).play
        && !!figure.querySelector('figcaption')?.textContent.trim();
      }));
      test(players.length===5 && players.every(Boolean) && data.instructionSteps===3,
           key+' five accessible players fit the viewport and all three steps render', players);
     }
     if(kind==='free-expression')test(data.hasAppeal,key+' appeal anchor exists');
     if(kind==='c2pa') {
       test(data.instructionSteps===3 && data.verificationRows===5 && data.hasC2paSpec,
            key+' three steps and five provenance results with C2PA source',
            {steps:data.instructionSteps,rows:data.verificationRows,source:data.hasC2paSpec});
     }
     if(kind==='metadata') {
       test(data.instructionSteps===5 && data.hasIrishRegulator && data.hasOriginalAssessment && data.hasSignedCredentials,
            key+' five metadata steps, official source and provenance cautions',
            {steps:data.instructionSteps,regulator:data.hasIrishRegulator,assessment:data.hasOriginalAssessment,credentials:data.hasSignedCredentials});
     }
     if(['motion','frc','noise'].includes(kind)){
       const videoExpected={
         motion:['/assets/videos/comparison.mp4','/assets/videos/motion-blur-comparison-poster.jpg','demo-video-10','1216','1080'],
         frc:['/assets/videos/hummingbird-comparison.mp4','/assets/videos/hummingbird-comparison-poster.jpg','comparison-video','672','720'],
         noise:['/assets/videos/temporal-noise-comparison.mp4','/assets/videos/temporal-noise-comparison-poster.jpg','comparison-video','2560','720']
       }[kind];
       const v=data.comparisonVideo;
       test(v.src===videoExpected[0]&&v.poster===videoExpected[1]&&v.id===videoExpected[2]&&
            v.width===videoExpected[3]&&v.height===videoExpected[4]&&v.playsinline&&
            v.hasPlayButton&&v.hasStatus&&v.hasCaption&&v.hasAlt,
            key+' preserved video source, poster, dimensions, controls and caption',v);
       if(size.width<=390) test(v.withinBounds,key+' full comparison video remains within its article',v);
     }
     if(kind==='privacy'){
       const minimum = ['ja','ko','zh-Hant'].includes(lang) ? 400 : 1500;
       test(data.bodyLength>minimum,key+' complete privacy-policy body',{bodyLength:data.bodyLength,minimum});
     }
     if (size.width<=390 && ['de','pt-BR','ja','uk'].includes(lang)) {
      if(['about','press','blog','gallery','tutorials','c2pa','metadata','motion','frc','noise','layout'].includes(kind)) {
       if(kind==='c2pa') await page.locator('main table').scrollIntoViewIfNeeded();
       if(kind==='metadata') await page.locator('main ol').scrollIntoViewIfNeeded();
       if(['motion','frc','noise','layout'].includes(kind)) await page.locator('main figure').first().scrollIntoViewIfNeeded();
       await page.screenshot({path:path.join(OUT,lang+'-'+kind+'-'+size.width+'.png'),animations:'disabled'});
      }
     }
    }
   }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(ORIGIN+'/de/blog/');
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/ja/blog/"]').click();
  await page.locator('.topic-links a[href="#edit-videos"]').click();
  test(page.url().endsWith('/ja/blog/#edit-videos'),'Blog language and topic links preserve the selected index');
  await page.locator('.post-card[hreflang="ja"]').first().click();
  test(await page.locator('html').getAttribute('lang')==='ja','Translated blog card opens Japanese content');
  await page.goto(ORIGIN+'/de/blog/');
  await page.locator('.post-card[hreflang="en"]').first().click();
  test(await page.locator('html').getAttribute('lang')==='en','Labeled English card opens English content');
  await page.goto(ORIGIN+'/de/press.html');
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/ja/press.html"]').click();
  test(page.url().endsWith('/ja/press.html'),'Press language switch opens the equivalent kit');
  for(const link of await page.locator('#assets .asset-dl').all()){
   const href=await link.getAttribute('href');
   const response=await page.request.get(ORIGIN+href);
   test(response.ok() && response.headers()['content-type']?.startsWith('image/'),
        'Press asset returns an image', {href,status:response.status()});
  }
  await page.goto(ORIGIN+'/de/layout/', {waitUntil:'domcontentloaded'});
  const demo = page.locator('#layout-sunset-hexagons-portrait-video');
  await page.locator('.bw-play[aria-controls="layout-sunset-hexagons-portrait-video"]').click();
  await page.waitForFunction(() => document.querySelector('#layout-sunset-hexagons-portrait-video').currentTime > 0,
    null, {timeout: 40000}).catch(error => { if (error.name !== 'TimeoutError') throw error; });
  const playback = await demo.evaluate(v => ({
   time:v.currentTime, controls:v.controls, paused:v.paused, source:v.currentSrc,
   error:v.error?.message, readyState:v.readyState, mp4:v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
   status:v.closest('.bw-player').querySelector('[role="status"]').textContent
  }));
  test(playback.time > 0 && playback.controls && !playback.paused,
       'Layout portrait demo plays with native controls after activation', playback);
  await page.goto(ORIGIN+'/de/about.html',{waitUntil:'domcontentloaded'});
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/ja/about.html"]').click();
  test(page.url().endsWith('/ja/about.html'),'About desktop language switching preserves page type',{url:page.url()});
  await page.setViewportSize({width:390,height:844});
  await page.goto(ORIGIN+'/uk/tutorials/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-menu > summary').click();
  await page.locator('.site-menu a[href="/es/tutorials/"]').click();
  test(page.url().endsWith('/es/tutorials/'),'Tutorials mobile language switching preserves page type',{url:page.url()});
  await page.goto(ORIGIN+'/fr/gallery/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-menu > summary').click();
  await page.locator('.site-menu a[href="/pt-br/gallery/"]').click();
  test(page.url().endsWith('/pt-br/gallery/'),'Gallery language switching preserves page type',{url:page.url()});
  await page.setViewportSize({width:1440,height:900});
  await page.goto(ORIGIN+'/de/tutorials/check-c2pa-content-credentials/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/ja/tutorials/check-c2pa-content-credentials/"]').click();
  test(page.url().endsWith('/ja/tutorials/check-c2pa-content-credentials/'),
       'C2PA guide language switch preserves corresponding translated guide',{url:page.url()});
  await page.setViewportSize({width:390,height:844});
  await page.goto(ORIGIN+'/pt-br/tutorials/remove-location-metadata/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-menu > summary').click();
  await page.locator('.site-menu a[href="/fr/tutorials/remove-location-metadata/"]').click();
  test(page.url().endsWith('/fr/tutorials/remove-location-metadata/'),
       'Metadata mobile language switch preserves corresponding guide',{url:page.url()});
  await page.setViewportSize({width:1440,height:900});
  await page.goto(ORIGIN+'/de/tutorials/motion-blur/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/ja/tutorials/motion-blur/"]').click();
  test(page.url().endsWith('/ja/tutorials/motion-blur/'),
       'Motion blur desktop language switch preserves the comparison',{url:page.url()});
  await page.setViewportSize({width:390,height:844});
  await page.goto(ORIGIN+'/pt-br/tutorials/temporal-noise-reduction/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-menu > summary').click();
  await page.locator('.site-menu a[href="/fr/tutorials/temporal-noise-reduction/"]').click();
  test(page.url().endsWith('/fr/tutorials/temporal-noise-reduction/'),
       'Noise reduction mobile language switch preserves comparison',{url:page.url()});
 } finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({url:ORIGIN,locales:locales.length,types:routes.length,
    assertions:checks.length,failures:issues.length,issues,checks},null,2));
  console.log('SECONDARY BROWSER QA',JSON.stringify({locales:locales.length,pageTypes:routes.length,checks:checks.length,failures:issues.length}));
  if(issues.length) console.error('FAILED',JSON.stringify(issues.slice(0,30),null,2));
 }
 if(issues.length) process.exitCode=1;
})().catch(error=>{console.error('Browser smoke failed:',error);process.exitCode=1;});
