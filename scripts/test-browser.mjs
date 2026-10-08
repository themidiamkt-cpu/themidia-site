import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { qualify } from '../lib/clinica-estetica/lead.mjs';
// Use PLAYWRIGHT_MODULE para uma instalação de Playwright disponível na máquina.
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
await mkdir('test-results',{recursive:true});
const origin=process.env.TEST_URL||'http://localhost:4173';
const report={layouts:[],flows:[]};
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/clinica-estetica/');await page.evaluate(()=>document.fonts.ready);
  await page.locator('#lead-form').waitFor();
  assert.equal(await page.locator('#qualification-modal').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('.form-modal').isVisible(),true);
  assert.equal(await page.locator('.hero').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow em ${width}`);
  assert.equal(await page.locator('body').innerText().then(t=>t.includes('—')),false);
  await page.screenshot({path:`test-results/form-popup-${width}.png`,fullPage:true});report.layouts.push({width,overflow:false,popup:'open',lp:'not rendered'});
 }
 assert.deepEqual(errors,[]);await page.close();
 for(const nutrition of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await context.newPage();
  await p.route('**/clinica-estetica/config.js',r=>r.fulfill({contentType:'application/javascript',body:`window.CLINICA_CONFIG={endpoint:'/api/clinica-estetica',pixelId:'123',instagramUrl:'https://www.instagram.com/agenciathemidia/',whatsappUrl:'https://wa.me/5519999315179',bookingUrl:'https://example.com/agenda'};`}));
  await p.route('https://connect.facebook.net/**',r=>r.fulfill({contentType:'application/javascript',body:''}));
  const requests=[];let first=true;
  await p.route('**/api/clinica-estetica',async r=>{const body=r.request().postDataJSON();requests.push(body);if(!nutrition&&first){first=false;return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Tente novamente.'})});}const q=qualify(body);return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:body.event_id,qualified:q.qualified,redirect:`/clinica-estetica/obrigado/${q.qualified?'qualificado':'nutricao'}/`})});});
  await p.goto(origin+'/clinica-estetica/?utm_source=instagram&utm_campaign=teste&utm_content=reels&fbclid=TESTCLICK');
  await p.reload();
  assert.equal(await p.locator('#qualification-modal').getAttribute('aria-hidden'),'false');
  await p.locator('[data-close-form]').click();await p.locator('#qualification-modal').waitFor({state:'hidden'});assert.equal(await p.locator('#closed-form-state').isVisible(),true);
  await p.locator('[data-open-form]').click();await p.locator('#qualification-modal').waitFor({state:'visible'});assert.equal(await p.locator('#closed-form-state').isVisible(),false);
  await p.locator('#next-button').click();assert.match(await p.locator('#form-error').innerText(),/Preencha/);
  await p.locator('#answer').fill('Pessoa Teste');await p.locator('#next-button').click();
  await p.locator('#back-button').click();assert.equal(await p.locator('#answer').inputValue(),'Pessoa Teste');await p.locator('#next-button').click();
  await p.locator('#answer').fill('20987654321');await p.locator('#next-button').click();assert.match(await p.locator('#form-error').innerText(),/DDD/);
  await p.locator('#answer').fill('19987654321');assert.equal(await p.locator('#answer').inputValue(),'(19) 98765-4321');await p.locator('#next-button').click();
  await p.locator('#answer').fill('Clínica de Teste');await p.locator('#next-button').click();
  await p.locator('#answer').fill('clinica.teste');await p.locator('#next-button').click();
  await p.locator('#answer').selectOption('Outra');await p.locator('#next-button').click();assert.match(await p.locator('#form-error').innerText(),/cidade/);
  await p.locator('#cidade-outra').fill('Limeira/SP');await p.locator('#next-button').click();
  for(const [key,value]of [['profissionais',nutrition?'solo':'2-4'],['ticket','400-800'],['anuncios','sim'],['verba','1500-3000'],['atendimento','recepcionista']]){await p.locator(`input[name="${key}"][value="${value}"]`).check();if(key!=='atendimento')await p.locator('#next-button').click();}
  assert.equal(await p.locator('#step-count').innerText(),'10 / 10');
  await p.locator('#next-button').click();assert.match(await p.locator('#form-error').innerText(),/consentimento/);assert.equal(requests.length,0);
  await p.locator('#consentimento').check();
  await p.screenshot({path:`test-results/form-${nutrition?'nutricao':'qualificado'}.png`,fullPage:false});
  if(!nutrition){await p.locator('#next-button').click();await p.getByText('Tente novamente.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.fbq.queue.filter(a=>a[1]==='Lead').length),0);}
  // Captura os eventos antes da navegação para verificar a deduplicação.
  await p.addInitScript(()=>{});
  const events=[];await p.exposeFunction('recordEvent',(args)=>events.push(args));
  await p.evaluate(()=>{const original=window.fbq;window.fbq=function(...args){window.recordEvent(args);return original(...args);};});
  await p.locator('#next-button').click();await p.waitForURL(`**/obrigado/${nutrition?'nutricao':'qualificado'}/`);
  assert.equal(requests.at(-1).attribution.utm_campaign,'teste');assert.equal(requests.at(-1).attribution.fbclid,'TESTCLICK');assert.equal(requests.at(-1).cidade_outra,'Limeira/SP');
  assert.equal(events.filter(e=>e[1]==='Lead').length,1);assert.equal(events.filter(e=>e[1]==='LeadQualificado').length,nutrition?0:1);
  assert.equal(events.find(e=>e[1]==='Lead')[3].eventID,requests.at(-1).event_id);
  if(!nutrition){assert.equal(requests[0].event_id,requests[1].event_id);assert.equal(await p.locator('[data-booking]').getAttribute('href'),'https://example.com/agenda');}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:`test-results/obrigado-${nutrition?'nutricao':'qualificado'}.png`,fullPage:true});report.flows.push({type:nutrition?'nutricao':'qualificado',steps:10,utm:'preserved',consent:'required',events:events.map(e=>e[1])});await context.close();
 }
 const perf=await browser.newPage({viewport:{width:390,height:844}});const cdp=await perf.context().newCDPSession(perf);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await perf.addInitScript(()=>{window.lastLcp=0;new PerformanceObserver(list=>{window.lastLcp=list.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});});await perf.goto(origin+'/clinica-estetica/');await perf.waitForTimeout(1800);report.performance=await perf.evaluate(()=>({lcp_ms:Math.round(window.lastLcp),resources_bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),profile:'1.6 Mbps, 150ms RTT, CPU 4x, local server, Pixel disabled'}));await perf.close();
 await writeFile('test-results/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
