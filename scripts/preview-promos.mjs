import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('test-artifacts', {recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  for(const width of [390,820,1121,1280,1440]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({status:200,body:''}));
    await page.addInitScript(()=>localStorage.setItem('tiger-cookie-choice','essential'));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view')));
    await page.locator('#packages').screenshot({path:`test-artifacts/promo-${width}.png`,style:'.skip-link,.mobile-actions{visibility:hidden!important}'});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`test-artifacts/promo-home-${width}.png`,fullPage:width===390||width===1440});
    console.log(width, await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector('.header-inner').scrollWidth,viewport:innerWidth,grid:getComputedStyle(document.querySelector('.packages-grid')).gridTemplateColumns})));
    await page.close();
  }
} finally {await browser.close();}
