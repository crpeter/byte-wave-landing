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
 ['check-ai-video-without-uploading','blog/check-ai-video-without-uploading.html'],
 ['can-photos-videos-reveal-your-address','blog/can-photos-videos-reveal-your-address.html'],
 ['photo-access-ai-privacy-inferences','blog/photo-access-ai-privacy-inferences.html'],
 ['content-credentials-privacy','blog/content-credentials-privacy.html'],
 ['ai-training-creator-consent','blog/ai-training-creator-consent.html'],
 ['chatgpt-fake-artist-signatures','blog/chatgpt-fake-artist-signatures.html'],
 ['chatgpt-image-generation-ads','blog/chatgpt-image-generation-ads.html'],
 ['google-photos-ai-memories-dont-need-fixing','blog/google-photos-ai-memories-dont-need-fixing.html'],
 ['edit-videos-no-account-iphone','blog/edit-videos-no-account-iphone.html'],
 ['capcut-privacy-video-upload','blog/capcut-privacy-video-upload.html'],
 ['disable-youtube-ai-remix','blog/disable-youtube-ai-remix.html'],
 ['turn-off-youtube-automatic-dubbing','blog/turn-off-youtube-automatic-dubbing.html'],
 ['does-emoji-protect-child-face-facebook','blog/does-emoji-protect-child-face-facebook.html'],
 ['youtube-likeness-detection-privacy','blog/youtube-likeness-detection-privacy.html'],
 ['tiktok-ai-avatars-product-ads','blog/tiktok-ai-avatars-product-ads.html'],
 ['meta-ray-ban-glasses-unwanted-recordings','blog/meta-ray-ban-glasses-unwanted-recordings.html'],
 ['meta-muse-ai-privacy-concerns','blog/meta-muse-ai-privacy-concerns.html'],
 ['meta-muse-shared-chats-exposed','blog/meta-muse-shared-chats-exposed.html'],
 ['meta-muse-profiles-people-who-never-signed-up','blog/meta-muse-profiles-people-who-never-signed-up.html'],
 ['disconnect-meta-muse','blog/disconnect-meta-muse.html'],
 ['whatsapp-ai-support-hidden-instructions','blog/whatsapp-ai-support-hidden-instructions.html'],
 ['facebook-camera-roll-unposted-photos','blog/facebook-camera-roll-unposted-photos.html'],
 ['meta-ai-chats-feed-ads-personalization','blog/meta-ai-chats-feed-ads-personalization.html'],
 ['keep-ai-out-of-the-classroom','blog/keep-ai-out-of-the-classroom.html'],
 ['google-schools-ai-search-access','blog/google-schools-ai-search-access.html'],
 ['the-ai-teacher-was-wrong','blog/the-ai-teacher-was-wrong.html'],
 ['offline-video-editor-airplane-mode-test','blog/offline-video-editor-airplane-mode-test.html'],
 ['adobe-venezuela-creative-cloud-access','blog/adobe-venezuela-creative-cloud-access.html'],
 ['google-nest-cloud-features-end-support','blog/google-nest-cloud-features-end-support.html'],
 ['europe-digital-sovereignty-cloud-dependence','blog/europe-digital-sovereignty-cloud-dependence.html'],
 ['payment-processors-itch-io-content-control','blog/payment-processors-itch-io-content-control.html'],
 ['how-bytewave-feed-works-without-server-watch-history','blog/how-bytewave-feed-works-without-server-watch-history.html'],
 ['x-free-speech-account-control','blog/x-free-speech-account-control.html'],
 ['tiktok-us-deal-bytedance-china-ties','blog/tiktok-us-deal-bytedance-china-ties.html'],
 ['meta-technical-errors-political-accounts','blog/meta-technical-errors-political-accounts.html'],
 ['meta-no-kings-instagram-suspension','blog/meta-no-kings-instagram-suspension.html'],
 ['meta-angie-nixon-instagram-suspension','blog/meta-angie-nixon-instagram-suspension.html'],
 ['meta-25-billion-privacy-judgment','blog/meta-25-billion-privacy-judgment.html'],
 ['tiktok-internal-child-safety-warnings','blog/tiktok-internal-child-safety-warnings.html'],
 ['gates-foundation-ai-in-schools','blog/gates-foundation-ai-in-schools.html'],
 ['youre-not-alone-wanting-less-ai','blog/youre-not-alone-wanting-less-ai.html'],
 ['openai-sora-deepfakes-public-trust','blog/openai-sora-deepfakes-public-trust.html'],
 ['best-free-video-editor-no-watermark','blog/best-free-video-editor-no-watermark.html'],
 ['slow-motion-video-iphone-free','blog/slow-motion-video-iphone-free.html'],
 ['custom-video-filters-ai-tutorial','blog/custom-video-filters-ai-tutorial.html'],
 ['community-filters-bytewave','blog/community-filters-bytewave.html'],
 ['tools-newsrooms-check-ai-generated-media','blog/tools-newsrooms-check-ai-generated-media.html'],
 ['provenance','blog/provenance.html'],
 ['your-feed','blog/your-feed.html'],
 ['anthropic-claude-public-trust','blog/anthropic-claude-public-trust.html'],
 ['apple-app-store-commissions-free-alternatives','blog/apple-app-store-commissions-free-alternatives.html'],
 ['russia-geoblocking-disinformation','blog/russia-geoblocking-disinformation.html'],
 ['starlink-ukraine-cell-service-trust','blog/starlink-ukraine-cell-service-trust.html'],
 ['is-capcut-banned-2026','blog/is-capcut-banned-2026.html'],
 ['free-software-movement-2.0','blog/free-software-movement-2.0.html'],
 ['meta-settlement-youth-safety-social-media-design','blog/meta-settlement-youth-safety-social-media-design.html'],
 ['tiktok-congress-child-safety-platform-accountability','blog/tiktok-congress-child-safety-platform-accountability.html'],
 ['video-editing-app-comparison-2026','blog/video-editing-app-comparison-2026.html'],
 ['bytewave-advanced-editing-keyframes-translation','blog/bytewave-advanced-editing-keyframes-translation.html'],
 ['what-are-metal-shaders-iphone-gpu','blog/what-are-metal-shaders-iphone-gpu.html'],
 ['bytewave-vs-vn-video-editor-2026','blog/bytewave-vs-vn-video-editor-2026.html'],
 ['free-capcut-alternative-2026','blog/free-capcut-alternative-2026.html'],
 ['how-to-check-ai-generated-photos-videos','blog/how-to-check-ai-generated-photos-videos.html'],
 ['reduce-ai-content-tiktok-feed','blog/reduce-ai-content-tiktok-feed.html'],
 ['reduce-ai-videos-facebook-feed','blog/reduce-ai-videos-facebook-feed.html'],
 ['tired-of-ai-videos-social-media','blog/tired-of-ai-videos-social-media.html'],
 ['bytewave-vs-meta-creative-control','blog/bytewave-vs-meta-creative-control.html'],
 ['meta-italy-facebook-camera-roll-fine','blog/meta-italy-facebook-camera-roll-fine.html'],
 ['meta-muse-privacy-security-incidents','blog/meta-muse-privacy-security-incidents.html'],
 ['meta-muse-privacy-security','blog/meta-muse-privacy-security.html'],
 ['the-next-tiktok-may-start-as-a-video-editor','blog/the-next-tiktok-may-start-as-a-video-editor.html'],
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
   const tutorialCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../_data/tutorial_hub', lang+'.json'), 'utf8'));
   const expectedTutorialCards = tutorialCatalog.cards.length;
   assert(expectedTutorialCards > 0, lang+' tutorial catalog must not be empty');
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
        card.hreflang !== document.documentElement.lang || !!label;
      }).map(card => card.getAttribute('href')));
      test(!broken.length,key+' all article cards fit and remain in the selected language',broken);
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
      test(data.tutorialCards===expectedTutorialCards&&data.brokenCardBounds.length===0,key+' all catalog tutorial cards are readable',{count:data.tutorialCards,expected:expectedTutorialCards,overflow:data.brokenCardBounds});
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
     if(kind==='bytewave-vs-vn-video-editor-2026'){
       const table = await page.locator('.comparison-scroll').evaluate(region => {
         const bounds=region.getBoundingClientRect();
         region.focus();
         region.scrollLeft=region.scrollWidth;
         return {rows:region.querySelectorAll('tbody tr').length,
           cells:region.querySelectorAll('tbody td').length,
           label:region.getAttribute('aria-label'),focused:document.activeElement===region,
           fits:bounds.left>=0&&bounds.right<=innerWidth+1,
           scrollable:region.scrollWidth>region.clientWidth,scrolled:region.scrollLeft>0};
       });
       test(table.rows===8&&table.cells===16&&table.label&&table.focused&&table.fits,
            key+' complete accessible comparison table',table);
       if(size.width<=390) test(table.scrollable&&table.scrolled,key+' comparison table scrolls within mobile width',table);
     }
     if(kind==='what-are-metal-shaders-iphone-gpu'){
       const code = await page.locator('pre.code-block').evaluate(block=>{
         const bounds=block.getBoundingClientRect();
         block.scrollLeft=block.scrollWidth;
         return {fits:bounds.left>=0&&bounds.right<=innerWidth+1,
           scrollable:block.scrollWidth>block.clientWidth,scrolled:block.scrollLeft>0,
           complete:block.textContent.includes('kernel void grayscale')&&block.textContent.includes('output.write')};
       });
       test(code.fits&&code.complete,key+' complete Metal example fits its article',code);
       if(size.width<=390) test(code.scrollable&&code.scrolled,key+' Metal example scrolls within mobile width',code);
     }
     if(kind==='bytewave-vs-meta-creative-control'){
       const table=await page.locator('table.comparison').evaluate(table=>{
         const r=table.getBoundingClientRect();
         return {rows:table.querySelectorAll('tbody tr').length,cells:table.querySelectorAll('td').length,
           columns:table.querySelectorAll('th[scope="col"]').length,caption:table.querySelector('caption')?.textContent.trim(),
           fits:r.left>=0&&r.right<=innerWidth+1};
       });
       test(table.rows===2&&table.cells===4&&table.columns===2&&table.caption&&table.fits,
            key+' full captioned comparison table fits',table);
     }
     if(kind==='the-next-tiktok-may-start-as-a-video-editor'){
       const loop=await page.locator('.loop').evaluate(loop=>{
         const steps=[...loop.querySelectorAll('[role="listitem"]')];
         return {label:loop.getAttribute('aria-label'),steps:steps.length,
           columns:getComputedStyle(loop).gridTemplateColumns.split(' ').length,
           fits:steps.every(step=>{const r=step.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&step.textContent.trim()&&step.querySelector('strong')?.textContent.trim()})};
       });
       test(loop.label&&loop.steps===4&&loop.fits&&loop.columns===(size.width<=390?1:2),
            key+' four complete network steps adapt to the viewport',loop);
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
      if(['about','press','blog','gallery','tutorials','c2pa','metadata','motion','frc','noise','layout','bytewave-vs-vn-video-editor-2026','what-are-metal-shaders-iphone-gpu','bytewave-vs-meta-creative-control','the-next-tiktok-may-start-as-a-video-editor'].includes(kind)) {
       if(kind==='bytewave-vs-vn-video-editor-2026') await page.locator('.comparison-scroll').scrollIntoViewIfNeeded();
       if(kind==='what-are-metal-shaders-iphone-gpu') await page.locator('pre.code-block').scrollIntoViewIfNeeded();
       if(kind==='bytewave-vs-meta-creative-control') await page.locator('table.comparison').scrollIntoViewIfNeeded();
       if(kind==='the-next-tiktok-may-start-as-a-video-editor') await page.locator('.loop').scrollIntoViewIfNeeded();
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
  await page.locator('.post-card[href="/de/blog/meta-muse-privacy-security.html"]').click();
  test(page.url().endsWith('/de/blog/meta-muse-privacy-security.html') && await page.locator('html').getAttribute('lang')==='de',
       'Formerly English-only card opens the complete German article');
  await page.locator('.site-language > summary').click();
  await page.locator('.site-language a[href="/blog/meta-muse-privacy-security.html"]').click();
  test(page.url().endsWith('/blog/meta-muse-privacy-security.html') && await page.locator('html').getAttribute('lang')==='en',
       'Article language switch still opens the English original');
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
