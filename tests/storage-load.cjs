// Real IndexedDB load test: two companies, two years, 20,000 entries per company/year.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(e.message));
  const url=process.env.FLY_TEST_URL||'http://127.0.0.1:8765/index.html';await page.goto(url);await page.waitForSelector('body[data-storage-ready=true]');
  const metrics=await page.evaluate(async()=>{
   const next={version:2,active:null,companies:[]},n=20000,years=[2025,2026];
   for(let ci=0;ci<2;ci++){
    const c={id:uid(),name:`Empresa de carga ${ci+1}`,document:'',accounts:initialAccounts(),entries:[]};
    const bank=c.accounts.find(a=>a.code==='1.1.02').id,revenue=c.accounts.find(a=>a.code==='3.1.01').id;
    for(let yi=0;yi<years.length;yi++)for(let i=0;i<n;i++){
     const amount=10000*(ci+1)+i%10;
     c.entries.push({id:uid(),number:yi*n+i+1,date:new Date(Date.UTC(years[yi],0,1+i%365)).toISOString().slice(0,10),reference:`NF ${yi*n+i+1}`,memo:'Recebimento de serviços prestados conforme documento fiscal da competência indicada.',lines:[{account:bank,debit:amount,credit:0},{account:revenue,debit:0,credit:amount}]});
    }
    next.companies.push(c);
   }
   next.active=next.companies[0].id;const compactBytes=new Blob([JSON.stringify(next)]).size;
   let start=performance.now();await commit(next,true);const initialWriteMs=performance.now()-start;
   start=performance.now();const persisted=await storage.read();const readMs=performance.now()-start;
   for(const c of persisted.data.companies)if(c.entries.length!==40000)throw Error('Contagem de carga incorreta.');
   from='2026-01-01';to='2026-12-31';start=performance.now();render();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const fullListMs=performance.now()-start;
   return {companies:2,yearsPerCompany:2,entriesPerCompanyPerYear:n,totalEntries:80000,compactMB:+(compactBytes/1e6).toFixed(2),initialWriteMs,readMs,fullListMs,displayedRows:document.querySelectorAll('.entries-list [data-entry]').length};
  });
  assert.equal(metrics.displayedRows,20000);assert.ok(metrics.compactMB>5);
  const edit=await page.evaluate(async()=>{
   const counts={},originalPut=IDBObjectStore.prototype.put,originalWrite=storage.write;let storageMs=0;
   IDBObjectStore.prototype.put=function(...args){counts[this.name]=(counts[this.name]||0)+1;return originalPut.apply(this,args);};
   storage.write=async function(...args){const t=performance.now();const result=await originalWrite.apply(this,args);storageMs=performance.now()-t;return result;};
   const t=performance.now();try{await mutate((_,c)=>{c.entries[0]={...c.entries[0],memo:'Histórico alterado no teste de carga'};});}finally{IDBObjectStore.prototype.put=originalPut;storage.write=originalWrite;}
   return {counts,storageMs,totalSaveAndRenderMs:performance.now()-t};
  });assert.deepEqual(edit.counts,{entries:1,meta:1});assert.ok(edit.storageMs<10000,`Regressão: gravação individual levou ${edit.storageMs} ms`);assert.ok(edit.totalSaveAndRenderMs<20000,`Regressão: salvar e renderizar levou ${edit.totalSaveAndRenderMs} ms`);metrics.singleEdit=edit;
  let start=performance.now();await page.reload();await page.waitForSelector('body[data-storage-ready=true]');metrics.reopenAndRenderMs=performance.now()-start;
  const checked=await page.evaluate(()=>{
   const c=company(),bank=c.accounts.find(a=>a.code==='1.1.02'),rev=c.accounts.find(a=>a.code==='3.1.01');
   const t=performance.now(),mv=movements(c,'2026-01-01','2026-12-31',true),trial=trialBalances(c,'2026-01-01','2026-12-31',true),all=movements(c);
   return {calculationMs:performance.now()-t,bankYear:raw(mv[bank.id]),revenueYear:-raw(mv[rev.id]),bankAll:raw(all[bank.id]),trialOpening:trial.rows.find(r=>r.account.id===bank.id).opening,trialClosing:trial.rows.find(r=>r.account.id===bank.id).closing,totals:trial.totals,companies:db.companies.length,entries:db.companies.map(c=>c.entries.length),memo:c.entries[0].memo};
  });assert.equal(checked.bankYear,200090000);assert.equal(checked.revenueYear,200090000);assert.equal(checked.bankAll,400180000);assert.equal(checked.trialOpening,200090000);assert.equal(checked.trialClosing,400180000);assert.equal(checked.totals.closing,0);assert.deepEqual(checked.entries,[40000,40000]);assert.equal(checked.memo,'Histórico alterado no teste de carga');metrics.reportCalculationMs=checked.calculationMs;
  await page.locator('[data-tab=balance]').click();assert.match(await page.locator('main').innerText(),/Balanço equilibrado/);assert.match(await page.locator('main').innerText(),/4\.001\.800,00/);
  await page.locator('[data-tab=income]').click();assert.match(await page.locator('main').innerText(),/2\.000\.900,00/);
  // Backup export and real file restore exceed the previous 30 MB import ceiling.
  start=performance.now();const downloaded=page.waitForEvent('download');await page.locator('#backupTop').click();const file=await downloaded,backupPath=await file.path();metrics.backupMs=performance.now()-start;metrics.backupMB=+(fs.statSync(backupPath).size/1e6).toFixed(2);assert.ok(fs.statSync(backupPath).size>30*1024*1024);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));assert.equal(backup.companies.reduce((n,c)=>n+c.entries.length,0),80000);
  await page.locator('[data-tab=settings]').click();const choose=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Restaurar backup JSON',exact:true}).click();start=performance.now();await(await choose).setFiles(backupPath);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('restaurado e validado'),null,{timeout:120000});metrics.restoreMs=performance.now()-start;
  assert.equal(await page.evaluate(async()=>(await storage.read()).data.companies.reduce((n,c)=>n+c.entries.length,0)),80000);
  // A specific company/date index can retrieve one month without scanning the other company.
  const range=await page.evaluate(()=>new Promise((resolve,reject)=>{const tx=storage.connection.transaction('entries','readonly'),r=tx.objectStore('entries').index('companyDate').count(IDBKeyRange.bound([db.active,'2026-01-01'],[db.active,'2026-01-31']));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));assert.ok(range>1600&&range<1800);metrics.indexedJanuaryEntries=range;
  assert.deepEqual(errors,[]);for(const key of Object.keys(metrics))if(typeof metrics[key]==='number'&&/Ms$/.test(key))metrics[key]=Math.round(metrics[key]);for(const key of ['storageMs','totalSaveAndRenderMs'])metrics.singleEdit[key]=Math.round(metrics.singleEdit[key]);
  fs.writeFileSync('/tmp/fly-storage-load-results.json',JSON.stringify(metrics,null,2)+'\n');console.log('PASS: 80,000 entries; 20,000/company/year; incremental edit; reload; balance, income and trial calculations; >30 MB JSON round trip; company/date index.');console.log(JSON.stringify(metrics,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
