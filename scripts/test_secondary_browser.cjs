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
 ['about','about.html'], ['free-expression','free-expression.html'],
 ['privacy','privacy.html'], ['tutorials','tutorials/'], ['gallery','gallery/']
];
const issues=[], checks=[];
function test(ok, label, result) {
 checks.push({ok, label, ...(result ? {result}: {})});
 if (!ok) issues.push({label,result});
}
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 const page = await browser.newPage();
 try {
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
       tutorialCards:cards.length,galleryVideos:media.length,
       mediaLabels:media.filter(v=>v.hasAttribute('data-bw-labels')).length,
       brokenCardBounds:cards.map((e,i)=>({r:e.getBoundingClientRect(),i})).filter(x=>x.r.left<-1||x.r.right>width+1).map(x=>x.i),
       missingPoster:media.filter(v=>!v.getAttribute('poster')).length,
       hasAppeal:!!document.querySelector('#appeal'),
       firstAlt:[...document.querySelectorAll('.gallery-grid video')].every(v=>!!v.getAttribute('aria-label')),
       visibleLangNav:!!document.querySelector('.site-language'),
       bodyLength:document.querySelector('main')?.textContent.trim().length,
       downloadURL:cta?.href
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
     test(data.docWidth<=data.viewWidth+1,key+' no page-level horizontal overflow',{scroll:data.docWidth,client:data.viewWidth});
     if (size.width<=390){
      test(!!data.logo&&!!data.menu&&!!data.cta &&
           data.logo.left>=-1&&data.cta.right<=size.width+1 &&
           data.menu.height>=44&&data.cta.height>=44,
        key+' mobile header usable',{logo:data.logo,menu:data.menu,cta:data.cta});
     }
     if(kind==='tutorials'){
      test(data.tutorialCards===10&&data.brokenCardBounds.length===0,key+' ten readable tutorial cards',{count:data.tutorialCards,overflow:data.brokenCardBounds});
     }
     if(kind==='gallery'){
      test(data.galleryVideos===13&&data.mediaLabels===13&&data.missingPoster===0&&data.firstAlt,key+' thirteen intact localized video players',
       {videoCount:data.galleryVideos,labels:data.mediaLabels,missingPosters:data.missingPoster});
     }
     if(kind==='free-expression')test(data.hasAppeal,key+' appeal anchor exists');
     if(kind==='privacy'){
       test(data.bodyLength>1500,key+' complete privacy-policy body',{bodyLength:data.bodyLength});
     }
     if (size.width<=390 && ['de','pt-BR','ja','uk'].includes(lang)) {
      if(['about','gallery','tutorials'].includes(kind))
       await page.screenshot({path:path.join(OUT,lang+'-'+kind+'-'+size.width+'.png'),animations:'disabled'});
     }
    }
   }
  }
  await page.setViewportSize({width:1440,height:900});
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
 } finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({url:ORIGIN,locales:locales.length,types:routes.length,
    assertions:checks.length,failures:issues.length,issues,checks},null,2));
  console.log('SECONDARY BROWSER QA',JSON.stringify({locales:locales.length,pageTypes:routes.length,checks:checks.length,failures:issues.length}));
  if(issues.length) console.error('FAILED',JSON.stringify(issues.slice(0,30),null,2));
 }
 if(issues.length) process.exitCode=1;
})().catch(error=>{console.error('Browser smoke failed:',error);process.exitCode=1;});
