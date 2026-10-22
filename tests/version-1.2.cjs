// Regression coverage for account field clicks, duplicate entries and synthetic trial balances.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const legacy=JSON.parse(readFileSync(path.join(__dirname,'fixtures/legacy-v1.json'),'utf8'));
legacy.companies[0].entries[1].reference='NF 02';
const KEY='fly.contabilidade.v1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768},locale:'pt-BR'});
  const page=await context.newPage(),errors=[],dialogs=[];let rejectNext=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{dialogs.push(d.message());if(rejectNext){rejectNext=false;await d.dismiss();}else await d.accept();});
  await page.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(data));},{key:KEY,data:legacy});
  await page.goto(process.env.FLY_TEST_URL||'http://127.0.0.1:8765/index.html');
  const data=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  const co=async()=>(await data()).companies[0];
  const nav=tab=>page.locator(`[data-tab="${tab}"]`).click();
  const source=(await co()).entries.find(e=>e.memo==='Receita');
  const field=()=>page.locator('#entryForm .account-query').first();
  assert.equal(await page.locator('#appVersion').innerText(),'v1.2.0');assert.match(await page.title(),/v1\.2\.0/);
  // Selecting a field and clicking it again must never open the account registration dialog.
  await field().fill('1.1.02');await field().press('ArrowDown');await field().press('Enter');await field().click();
  assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);assert.equal(await field().getAttribute('data-selected-account'),(await co()).accounts.find(a=>a.code==='1.1.02').id);
  assert.equal(await field().evaluate(e=>e===document.activeElement),true);
  await field().fill('Caixa');await field().press('ArrowDown');await field().press('Enter');await field().click();assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);assert.match(await field().inputValue(),/Caixa/);
  await nav('accounts');const bank=(await co()).accounts.find(a=>a.code==='1.1.02');await page.locator(`button[data-account="${bank.id}"]`).click();assert.equal(await page.getByRole('heading',{name:'Editar conta',exact:true}).count(),1);await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await nav('entries');await page.getByRole('button',{name:'Novo / Limpar',exact:true}).click();
  // Duplicating from the row starts an unsaved copy, not an edit of the original.
  const originalCount=(await co()).entries.length;
  await page.locator(`[data-duplicate="${source.id}"]`).click();
  assert.equal((await co()).entries.length,originalCount);assert.equal(await page.locator('#entryForm [name=date]').inputValue(),'');assert.equal(await page.locator('#entryForm [name=reference]').inputValue(),'NF 02');assert.equal(await page.locator('#entryForm [name=memo]').inputValue(),source.memo);assert.equal(await page.locator('#entryForm .delete-entry').count(),0);assert.match(await page.locator('.copy-notice').innerText(),/#2/);
  await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();assert.equal((await co()).entries.length,originalCount);assert.equal(await page.locator('#entryForm [name=date]').evaluate(e=>e.validity.valueMissing),true);
  await page.locator('#entryForm [name=date]').fill('2026-04-10');await page.locator('#entryForm [name=memo]').fill('Receita repetida');await page.locator('#entryForm [name=reference]').fill('NF 03');
  rejectNext=true;await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();assert.match(dialogs.at(-1),/Salvar a cópia.*10\/04\/2026/);assert.equal((await co()).entries.length,originalCount);assert.equal(await page.locator('#entryForm [name=memo]').inputValue(),'Receita repetida');
  await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();let current=await co();const duplicate=current.entries.find(e=>e.memo==='Receita repetida');assert.equal(current.entries.length,originalCount+1);assert.notEqual(duplicate.id,source.id);assert.equal(duplicate.number,5);assert.equal(duplicate.date,'2026-04-10');assert.equal(duplicate.reference,'NF 03');assert.deepEqual(duplicate.lines,source.lines);assert.deepEqual(current.entries.find(e=>e.id===source.id),source);assert.equal(Object.hasOwn(duplicate,'copiedFrom'),false);
  // Editing the filled account field has no navigation side effects either.
  await page.locator(`[data-edit="${source.id}"]`).click();await field().click();assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);assert.match(await page.locator('#entryForm h2').innerText(),/Editar lançamento #2/);
  await page.locator('#entryForm [name=memo]').fill('Alteração não salva');rejectNext=true;await page.locator('#entryForm .duplicate-entry').click();assert.equal(await page.locator('#entryForm [name=memo]').inputValue(),'Alteração não salva');assert.equal((await co()).entries.length,originalCount+1);
  await page.locator('#entryForm .duplicate-entry').click();assert.equal(await page.locator('#entryForm [name=memo]').inputValue(),source.memo);assert.equal(await page.locator('#entryForm [name=date]').inputValue(),'');assert.equal((await co()).entries.length,originalCount+1);await page.getByRole('button',{name:'Novo / Limpar',exact:true}).click();
  // The same duplicate action is available when an entry is opened from the ledger.
  await nav('ledger');await page.locator('#ledgerAccount').selectOption(bank.id);await page.locator(`[data-edit="${source.id}"]`).click();await page.locator('#dialogForm .account-query').first().click();assert.equal(await page.getByRole('heading',{name:'Editar conta',exact:true}).count(),0);assert.equal(await page.locator('#dialog').evaluate(d=>d.open),true);await page.locator('#dialogForm .duplicate-entry').click();assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);assert.equal(await page.locator('#entryForm [name=date]').inputValue(),'');await page.getByRole('button',{name:'Novo / Limpar',exact:true}).click();
  const closing=(await co()).entries.find(e=>e.closing);assert.equal(await page.locator(`[data-entry="${closing.id}"] [data-duplicate]`).count(),0);await page.locator(`[data-edit="${closing.id}"]`).click();assert.equal(await page.locator('#entryForm .duplicate-entry').count(),0);await page.getByRole('button',{name:'Novo / Limpar',exact:true}).click();
  // Parent accounts are presentation subtotals and do not increase overall totals.
  await nav('trial');assert.equal(await page.locator('[data-account-type=synthetic]').count(),0);const totals=await page.locator('tr.total').innerText();
  await page.getByRole('button',{name:'Mostrar contas sintéticas',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Esconder contas sintéticas',exact:true}).getAttribute('aria-pressed'),'true');current=await co();assert.equal(await page.locator('[data-account-type=synthetic]').count(),current.accounts.filter(a=>!a.postable).length);assert.equal(await page.locator('tr.total').innerText(),totals);
  const root=current.accounts.find(a=>a.code==='1'),funding=current.accounts.find(a=>a.code==='2');assert.match(await page.locator(`[data-trial-account="${root.id}"]`).innerText(),/1\.900,00 D/);assert.match(await page.locator(`[data-trial-account="${funding.id}"]`).innerText(),/1\.400,00 C/);assert.equal(await page.locator(`[data-trial-account="${root.id}"] [data-ledger]`).count(),0);
  let downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();let csv=readFileSync(await(await downloaded).path(),'utf8');assert.match(csv,/"Tipo"/);assert.match(csv,/"Sintética"/);assert.ok(csv.split('\r\n').some(row=>row.startsWith('"1";"Ativo";"Sintética";')));
  await page.screenshot({path:'/tmp/fly-v120-trial.png',fullPage:true});
  await nav('entries');await nav('trial');assert.equal(await page.getByRole('button',{name:'Esconder contas sintéticas',exact:true}).count(),1);await page.getByRole('button',{name:'Esconder contas sintéticas',exact:true}).click();assert.equal(await page.locator('[data-account-type=synthetic]').count(),0);assert.equal(await page.locator('tr.total').innerText(),totals);
  downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();csv=readFileSync(await(await downloaded).path(),'utf8');assert.doesNotMatch(csv,/"Sintética"/);
  // The report toggle respects the selected date window for opening balance and movements.
  await page.locator('#from').fill('2026-04-01');await page.locator('#to').fill('2026-04-30');await page.getByRole('button',{name:'Aplicar período',exact:true}).click();await page.getByRole('button',{name:'Mostrar contas sintéticas',exact:true}).click();const values=await page.locator(`[data-trial-account="${root.id}"] td`).allTextContents();assert.match(values[2],/1\.400,00 D/);assert.match(values[3],/500,00/);assert.match(values[5],/1\.900,00 D/);
  assert.deepEqual(errors,[]);console.log('PASS: v1.2.0 visible; selected account stays editable without opening its registration; account editing only on chart; duplicate from list, editor and ledger; explicit date and confirmation/cancel; original unchanged; closing exclusion; synthetic toggle, hierarchy, date range, stable totals and matching CSV.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
