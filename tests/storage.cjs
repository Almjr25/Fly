// IndexedDB integration tests use real Chromium transactions and isolated profiles.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-v1.json'),'utf8'));
const KEY='fly.contabilidade.v1',url=process.env.FLY_TEST_URL||'http://127.0.0.1:8765/index.html';
const launch={executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']};
async function ready(page){await page.goto(url);await page.waitForSelector('body[data-storage-ready=true]');}
async function snapshot(page){await page.waitForFunction(()=>!storageBusy);return page.evaluate(()=>storage.read());}
(async()=>{
 const browser=await chromium.launch(launch),profile=fs.mkdtempSync(path.join(os.tmpdir(),'fly-idb-persist-'));let diskContext;
 try{
  const context=await browser.newContext(),page=await context.newPage();page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(data));},{key:KEY,data:legacy});await ready(page);
  let before=await snapshot(page);assert.equal(before.initialized,true);assert.equal(before.data.version,2);assert.deepEqual(before.data.companies[0].entries,legacy.companies[0].entries);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),JSON.stringify(legacy));assert.equal(await page.evaluate(()=>storage.archive('before-indexeddb')),JSON.stringify(legacy));
  const revision=before.revision;await page.reload();await page.waitForSelector('body[data-storage-ready=true]');assert.equal((await snapshot(page)).revision,revision);
  // Only an affected record plus the revision metadata is written. Other entries are untouched.
  const writes=await page.evaluate(async()=>{
   const counts={},original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){counts[this.name]=(counts[this.name]||0)+1;return original.apply(this,args);};
   try{await mutate((_,c)=>{c.entries[0]={...c.entries[0],memo:'Histórico atualizado'};});}finally{IDBObjectStore.prototype.put=original;}return counts;
  });assert.deepEqual(writes,{entries:1,meta:1});before=await snapshot(page);assert.equal(before.data.companies[0].entries[0].memo,'Histórico atualizado');
  // A late quota failure must roll back an earlier successful request in the same transaction.
  const failure=await page.evaluate(async()=>{
   const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='entries')throw new DOMException('Quota de teste','QuotaExceededError');return original.apply(this,args);};
   try{await mutate((_,c)=>{c.name='Não deve persistir';c.entries[0]={...c.entries[0],memo:'Também não deve persistir'};});return null;}catch(e){return e.message;}finally{IDBObjectStore.prototype.put=original;}
  });assert.match(failure,/espaço disponível/);assert.deepEqual(await snapshot(page),before);assert.deepEqual(await page.evaluate(()=>db),before.data);
  // The browser's own asynchronous constraint failure must abort every preceding request too.
  const asynchronousFailure=await page.evaluate(async()=>{
   const c=db.companies[0],e=c.entries[0];
   try{await storage.write(savedRevision,[{store:'companies',action:'put',value:{id:c.id,data:{...companyRecord(c),name:'Não persistir por falha assíncrona'}}},{store:'entries',action:'put',value:{company:c.id,id:'duplicate-number',date:e.date,number:e.number,data:{...e,id:'duplicate-number'}}}],db);return null;}catch(err){return err.name;}
  });assert.equal(asynchronousFailure,'ConstraintError');assert.deepEqual(await snapshot(page),before);
  // Failed restore: clear(), metadata and account writes must all roll back together.
  const restoreFailure=await page.evaluate(async()=>{
   const next=structuredClone(db);next.companies[0].name='Restauração que falha';const original=IDBObjectStore.prototype.put;let requests=0;
   IDBObjectStore.prototype.put=function(...args){if(this.name==='accounts'&&++requests===3)throw Error('Interrupção simulada');return original.apply(this,args);};
   try{await commit(next,true);return null;}catch(e){return e.message;}finally{IDBObjectStore.prototype.put=original;}
  });assert.match(restoreFailure,/Interrupção/);assert.deepEqual(await snapshot(page),before);
  // Revisions protect even when notifications are missed or BroadcastChannel is unavailable.
  const other=await context.newPage();await other.addInitScript(()=>{globalThis.BroadcastChannel=undefined;});await ready(other);await other.evaluate(()=>mutate((_,c)=>c.name='Alteração confirmada em outra aba'));
  const conflict=await page.evaluate(async()=>{try{await mutate((_,c)=>c.name='Não sobrescrever');return null;}catch(e){return e.message;}});assert.match(conflict,/outra aba/);assert.equal((await snapshot(page)).data.companies[0].name,'Alteração confirmada em outra aba');await other.close();await page.reload();await page.waitForSelector('body[data-storage-ready=true]');
  // Delete a company and its accounts/entries in the same transaction, preserving the other company.
  await page.evaluate(()=>mutate(next=>{const c={id:uid(),name:'Empresa a excluir',accounts:initialAccounts(),entries:[]};const bank=c.accounts.find(a=>a.code==='1.1.02').id,capital=c.accounts.find(a=>a.code==='2.3.1.01').id;c.entries.push({id:uid(),number:1,date:'2026-01-01',memo:'Abertura',lines:[{account:bank,debit:100,credit:0},{account:capital,debit:0,credit:100}]});next.companies.push(c);}));
  const companyCount=(await snapshot(page)).data.companies.length;assert.equal(companyCount,2);const removed=(await snapshot(page)).data.companies[1].id;
  await page.evaluate(id=>mutate(next=>next.companies=next.companies.filter(c=>c.id!==id)),removed);assert.equal((await snapshot(page)).data.companies.length,1);
  assert.deepEqual(await page.evaluate(async id=>{const out={};for(const name of ['accounts','entries'])out[name]=await new Promise((resolve,reject)=>{const tx=storage.connection.transaction(name,'readonly'),r=tx.objectStore(name).index('company').count(IDBKeyRange.only(id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return out;},removed),{accounts:0,entries:0});
  // An already-initialized IndexedDB must work without reading or writing localStorage again.
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('localStorage indisponível');};Storage.prototype.setItem=()=>{throw Error('localStorage indisponível');};});
  // Avoid the earlier legacy-seeding init script by testing in a fresh page in the same context.
  const independent=await context.newPage();await independent.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('localStorage indisponível');};Storage.prototype.setItem=()=>{throw Error('localStorage indisponível');};});await ready(independent);assert.equal(await independent.locator('#pageError').isVisible(),false);await independent.evaluate(()=>mutate((_,c)=>c.name='IndexedDB independente do localStorage'));assert.equal((await snapshot(independent)).data.companies[0].name,'IndexedDB independente do localStorage');await independent.close();
  // A damaged record must block opening, but a confirmed valid restore can recover it atomically.
  const good=(await snapshot(page)).data;
  await page.evaluate(()=>new Promise((resolve,reject)=>{const tx=storage.connection.transaction('accounts','readwrite'),c=db.companies[0];tx.objectStore('accounts').delete([c.id,c.entries[0].lines[0].account]);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);}));
  const recovery=await context.newPage();recovery.on('dialog',d=>d.accept());await ready(recovery);assert.equal(await recovery.locator('#pageError').isVisible(),true);
  const picker=recovery.waitForEvent('filechooser');await recovery.getByRole('button',{name:'Restaurar backup',exact:true}).click();await(await picker).setFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(good))});await recovery.waitForFunction(()=>document.querySelector('#toast').textContent.includes('restaurado e validado'));assert.deepEqual((await snapshot(recovery)).data,good);await recovery.close();
  // Deliver the single HTML from disk while the browser network is offline, then reopen and save.
  const offline=await context.newPage();await offline.route('**/index.html',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')}));await context.setOffline(true);await ready(offline);assert.equal(await offline.locator('#pageError').isVisible(),false);await offline.evaluate(()=>mutate((_,c)=>c.name='Gravado após abertura sem rede'));await offline.reload();await offline.waitForSelector('body[data-storage-ready=true]');assert.equal((await snapshot(offline)).data.companies[0].name,'Gravado após abertura sem rede');await context.setOffline(false);await offline.close();
  assert.deepEqual(errors,[]);await context.close();
  // Version-2 localStorage installations migrate without changing account codes or references.
  const version2=structuredClone(before.data);version2.companies[0].accounts.push({id:'custom-v2',code:'4.1.04',name:'Impostos',kind:'expense',postable:true,normal:'D'});
  const v2Context=await browser.newContext();await v2Context.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:KEY,data:version2});const v2Page=await v2Context.newPage();await ready(v2Page);const v2Result=(await snapshot(v2Page)).data;assert.deepEqual(v2Result.companies[0].entries,version2.companies[0].entries);assert.deepEqual(v2Result.companies[0].accounts.find(a=>a.id==='custom-v2'),version2.companies[0].accounts.at(-1));assert.equal(await v2Page.evaluate(key=>localStorage.getItem(key),KEY),JSON.stringify(version2));await v2Context.close();
  // Unsupported IndexedDB must not silently create a new empty company or overwrite legacy data.
  const unavailable=await browser.newContext();await unavailable.addInitScript(({key,data})=>{localStorage.setItem(key,JSON.stringify(data));Object.defineProperty(globalThis,'indexedDB',{value:undefined});},{key:KEY,data:legacy});const bad=await unavailable.newPage();await ready(bad);assert.match(await bad.locator('#pageError').innerText(),/IndexedDB não está disponível/);assert.equal(await bad.getByRole('button',{name:'+ Criar primeira empresa',exact:true}).isDisabled(),true);assert.equal(await bad.evaluate(key=>localStorage.getItem(key),KEY),JSON.stringify(legacy));const dl=bad.waitForEvent('download');await bad.locator('#backupTop').click();assert.equal(fs.readFileSync(await(await dl).path(),'utf8'),JSON.stringify(legacy));await unavailable.close();
  // Malformed legacy JSON never creates an initialized empty database.
  const malformed=await browser.newContext();await malformed.addInitScript(key=>localStorage.setItem(key,'{invalid'),KEY);const malformedPage=await malformed.newPage();await ready(malformedPage);assert.equal(await malformedPage.locator('#pageError').isVisible(),true);assert.equal(await malformedPage.evaluate(()=>storage.state()),undefined);assert.equal(await malformedPage.evaluate(key=>localStorage.getItem(key),KEY),'{invalid');await malformed.close();
  // Verify disk persistence across an actual close/reopen of Chromium, not just a page reload.
  diskContext=await chromium.launchPersistentContext(profile,launch);let diskPage=await diskContext.newPage();await ready(diskPage);await diskPage.evaluate(()=>mutate(next=>{const c={id:uid(),name:'Persistência em disco',accounts:initialAccounts(),entries:[]};next.companies.push(c);next.active=c.id;}));const diskSnapshot=(await snapshot(diskPage)).data;await diskContext.close();diskContext=null;
  diskContext=await chromium.launchPersistentContext(profile,launch);diskPage=await diskContext.newPage();await ready(diskPage);assert.deepEqual((await snapshot(diskPage)).data,diskSnapshot);await diskContext.close();diskContext=null;
  console.log('PASS: v1/v2 migration and archives, legacy preservation, incremental writes, quota rollback, restore rollback, conflict revisions, company deletion, localStorage independence, recovery of corrupted records, unsupported storage, invalid legacy input, offline reopen/save, and persistence across browser restarts.');
 }finally{if(diskContext)await diskContext.close();await browser.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
