import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:4173';
const expected = [
  ['Essential Grooming', 'd2a6d9ff-3d76-439d-a1b8-e964332e3dca',189,235,46],
  ['Signature Grooming','1cb3e209-6fdc-4325-9487-3fc88e20dec2',420,475,55],
  ['Premium Care','ee86a400-e322-46ec-ba1d-0b5629464b61',899,1035,136],
  ['Ultimate Tiger Experience','528c4176-85f1-423e-8c26-f335ef5fd235',1399,1665,266],
  ['Full Grooming Spa','70af9766-6757-4760-9560-87d9aef6d6ac',1070,1270,200]
];
const findings = [], checks = [];
function assert(condition,message) { if (!condition) findings.push(message); }
mkdirSync('test-artifacts/promo-qa',{recursive:true});
const browser = await chromium.launch({headless:true,channel:'msedge'});
try {
  for (const width of [320,390,768,820,1121,1280,1440]) {
    for (const provider of ['setmore','fresha']) {
      const context = await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://www.googletagmanager.com/**', route=>route.fulfill({status:200,body:''}));
      await page.route(`${base}/assets/data/site-content.json`, route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:{booking:{provider,setmoreUrl:'https://tigergentssaloon.setmore.com/',freshaUrl:'https://www.fresha.com/a/qa-general'}}})}));
      await page.addInitScript(()=>localStorage.setItem('tiger-cookie-choice','essential'));
      await page.goto(`${base}/#packages`,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.querySelector('.site-header'));
      await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view')));
      const buttons = page.locator('#packages .js-booking');
      assert(await buttons.count()===5,`${width}/${provider}: not five package buttons`);
      const layout = await page.evaluate(()=>{
        const rect = selector => [...document.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText.slice(0,50),x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
        return {overflow:document.documentElement.scrollWidth-innerWidth,header:rect('.brand,.site-nav,.header-actions'),promo:rect('.package-card,.package-spa,.package-book'),heading:document.querySelector('#packages-heading').getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom};
      });
      assert(layout.overflow<=1,`${width}/${provider}: horizontal overflow ${layout.overflow}px`);
      assert(layout.heading>=layout.headerBottom-1,`${width}/${provider}: packages heading under header (${layout.heading}<${layout.headerBottom})`);
      for (let i=0;i<layout.header.length;i++) for (let j=i+1;j<layout.header.length;j++) {
        const a=layout.header[i],b=layout.header[j];
        assert(!(a.x<b.right&&b.x<a.right&&a.y<b.bottom&&b.y<a.bottom),`${width}/${provider}: header overlap ${a.text} / ${b.text}`);
      }
      for(const box of layout.promo) assert(box.x>=-1&&box.right<=width+1,`${width}/${provider}: promo element outside viewport ${JSON.stringify(box)}`);
      for (let i=0;i<5;i++) {
        const [name,id,offer,original,saving] = expected[i];
        const button = buttons.nth(i);
        const meta = await button.evaluate(e=>({href:e.href,provider:e.dataset.bookingProvider,name:e.dataset.packageName,id:e.dataset.packageId,price:+e.dataset.packagePrice,label:e.getAttribute('aria-label'),height:e.getBoundingClientRect().height,body:e.closest('article').innerText}));
        const url = new URL(meta.href);
        assert(meta.name===name&&meta.id===id&&meta.price===offer,`${width}/${provider}: wrong package metadata ${name}`);
        assert(meta.provider==='fresha'&&url.hostname==='www.fresha.com'&&url.searchParams.get('initialItemIds')===id&&url.searchParams.get('pId')==='2516452',`${width}/${provider}: promo URL lost ${name}`);
        assert(meta.body.includes(`Save AED ${saving}`)&&meta.body.includes(original.toLocaleString('en'))&&meta.body.includes(offer.toLocaleString('en')),`${width}/${provider}: price/savings incorrect ${name}`);
        assert(meta.label?.includes(name)&&meta.height>=44,`${width}/${provider}: booking accessibility issue ${name}`);
        await page.evaluate(()=>window.dataLayer=[]);
        await button.evaluate(e=>e.addEventListener('click',event=>event.preventDefault(),{once:true}));
        await button.click();
        const events=await page.evaluate(()=>window.dataLayer.filter(e=>e.event==='booking_click'));
        assert(events.length===1,`${width}/${provider}: ${name} has ${events.length} booking events`);
        const e=events[0];
        assert(e?.package_id===id&&e.package_name===name&&e.package_offer_price===offer&&e.currency==='AED'&&e.booking_provider==='fresha'&&e.booking_destination_host==='www.fresha.com'&&e.booking_click_device===(width<=820?'mobile':'desktop'),`${width}/${provider}: event metadata incorrect ${name} ${JSON.stringify(e)}`);
      }
      const general=await page.locator('.js-booking:not([data-booking-fixed])').evaluateAll(es=>es.map(e=>({provider:e.dataset.bookingProvider,href:e.href})));
      const generalUrl=provider==='fresha'?'https://www.fresha.com/a/qa-general':'https://tigergentssaloon.setmore.com/';
      assert(general.length>0&&general.every(e=>e.provider===provider&&e.href===generalUrl),`${width}/${provider}: general provider configuration failed`);
      const spa=await page.locator('.package-spa').innerText();
      const ultimate=await page.locator('.package-card-highlight').innerText();
      assert(spa.includes('excluding Brazilian')&&spa.includes('1 hour'),`${width}/${provider}: spa conditions missing`);
      assert((ultimate.match(/short & medium hair/g)||[]).length===2,`${width}/${provider}: short/medium conditions missing`);
      await page.evaluate(()=>scrollTo(0,0));
      const menu=page.locator('.menu-toggle');
      if(await menu.isVisible()) {
        await menu.click();
        assert(await menu.getAttribute('aria-expanded')==='true',`${width}/${provider}: menu doesn't open`);
        await page.locator('.site-nav a[href="index.html#packages"]').click();
        await page.waitForTimeout(250);
        assert(await page.locator('body').evaluate(e=>!e.classList.contains('nav-open')),`${width}/${provider}: menu remains open after package navigation`);
      } else await page.locator('.site-nav a[href="index.html#packages"]').click();
      assert(new URL(page.url()).hash==='#packages',`${width}/${provider}: package nav destination failed`);
      await page.waitForTimeout(200);
      await page.evaluate(()=>scrollTo(0,0));
      await page.waitForFunction(()=>scrollY===0);
      await page.waitForTimeout(100);
      const topLayout=await page.evaluate(()=>{
        const boxes=[...document.querySelectorAll('.brand,.site-nav,.header-actions')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText.slice(0,50),x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
        const skip=document.querySelector('.skip-link');
        return {boxes,skip:{focused:skip.matches(':focus'),top:skip.getBoundingClientRect().top,bottom:skip.getBoundingClientRect().bottom,transform:getComputedStyle(skip).transform}};
      });
      for(let i=0;i<topLayout.boxes.length;i++)for(let j=i+1;j<topLayout.boxes.length;j++){
        const a=topLayout.boxes[i],b=topLayout.boxes[j];
        assert(!(a.x<b.right&&b.x<a.right&&a.y<b.bottom&&b.y<a.bottom),`${width}/${provider}: top header overlap ${a.text} / ${b.text}`);
      }
      assert(topLayout.skip.focused||topLayout.skip.bottom<=0,`${width}/${provider}: unfocused skip link visible ${JSON.stringify(topLayout.skip)}`);
      if(provider==='fresha'&&[320,390,1121,1280,1440].includes(width)) await page.screenshot({path:`test-artifacts/promo-qa/top-${width}.png`});
      await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view')));
      if(provider==='fresha'&&[320,390,768,1121,1440].includes(width)) await page.screenshot({path:`test-artifacts/promo-qa/home-${width}.png`,fullPage:true});
      assert(errors.length===0,`${width}/${provider}: JS errors ${errors.join(';')}`);
      checks.push({width,provider,passed:!findings.some(s=>s.startsWith(`${width}/${provider}:`)),layout,topLayout});
      await context.close();
    }
  }
  const cookieContext=await browser.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});
  const cookiePage=await cookieContext.newPage();
  await cookiePage.route('https://www.googletagmanager.com/**',r=>r.fulfill({status:200,body:''}));
  await cookiePage.goto(base,{waitUntil:'networkidle'});
  const cookie=await cookiePage.locator('.cookie-banner').boundingBox();
  const actions=await cookiePage.locator('.mobile-actions').boundingBox();
  assert(cookie&&actions&&cookie.y+cookie.height<=actions.y+1,`Cookie banner overlaps mobile actions at 320px: ${JSON.stringify({cookie,actions})}`);
  assert(await cookiePage.locator('[data-cookie="essential"]').isVisible(),'Essential-only action unavailable at 320px');
  await cookiePage.screenshot({path:'test-artifacts/promo-qa/cookies-320.png'});
  await cookiePage.locator('[data-cookie="essential"]').click();
  assert(await cookiePage.locator('.cookie-banner').isHidden(),'Cookie banner does not close');
  await cookieContext.close();
} finally {await browser.close();}
writeFileSync('test-artifacts/promo-qa/report.json',JSON.stringify({checks,findings},null,2));
console.log(JSON.stringify({scenarios:checks.length,findings},null,2));
process.exitCode=findings.length?1:0;
