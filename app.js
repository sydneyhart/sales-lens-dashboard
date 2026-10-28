'use strict';
const C=SalesCore,$=id=>document.getElementById(id);
let data=[], result=null, metric='revenue', aiDraft='', objectURL=null, generation=0, aiAbort=null, importVersion=0;
function setStatus(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function cancelAI(){generation++;aiAbort?.abort();aiAbort=null;aiDraft='';$('ai-draft').textContent='';$('ai-status').textContent='';$('ai').disabled=false;}
function populate(id,values,all){const select=$(id);select.replaceChildren();if(all){const option=document.createElement('option');option.value='';option.textContent='All '+all;select.append(option)}for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}}
function load(csv,label){
  const parsed=C.ingest(csv);cancelAI();data=parsed;
  populate('month',[...new Set(data.map(r=>r.month))].sort().reverse());
  for(const id of ['region','rep','product'])populate(id,[...new Set(data.map(r=>r[id]))].sort(),{region:'regions',rep:'reps',product:'products'}[id]);
  $('dashboard').hidden=false;$('empty').hidden=true;$('export').disabled=false;$('clear').disabled=false;
  setStatus(`${label} · ${data.length} valid deals · ${new Set(data.map(r=>r.month)).size} months · data held only in memory`);update();
}
$('sample').onclick=()=>{importVersion++;try{load(window.SAMPLE_CSV,'Synthetic sample loaded')}catch(error){setStatus(error.message,true)}};
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;const ticket=++importVersion;try{if(file.size>2_000_000)throw Error('Maximum file size is 2 MB.');if(!/\.(csv|tsv)$/i.test(file.name))throw Error('Use CSV or TSV. Export XLSX as CSV UTF-8 first.');const csv=await file.text();if(ticket===importVersion)load(csv,'Uploaded spreadsheet loaded')}catch(error){if(ticket===importVersion)setStatus(`Import rejected: ${error.message}${data.length?' The previous dataset remains active.':''}`,true)}finally{if(ticket===importVersion)$('file').value=''}};
$('clear').onclick=()=>{importVersion++;cancelAI();data=[];result=null;for(const id of ['month','region','rep','product'])$(id).replaceChildren();for(const id of ['rep-table','attention','region-chart','product-chart'])$(id).replaceChildren();for(const id of ['summary','scope','revenue','deals','average','win-rate','revenue-change','deals-change','average-change'])$(id).textContent='';$('file').value='';if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;$('dashboard').hidden=true;$('empty').hidden=false;$('export').disabled=true;$('clear').disabled=true;setStatus('Session cleared. No uploaded data is retained by this page.')};
for(const id of ['month','region','rep','product'])$(id).onchange=update;
document.querySelectorAll('[data-metric]').forEach(button=>button.onclick=()=>{metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});update()});
function node(tag,text,cls){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(cls)element.className=cls;return element;}
function chart(id,groups){const parent=$(id);parent.replaceChildren();if(!groups.length){parent.append(node('p','No matching deals.','muted'));return}const max=Math.max(...groups.map(g=>g.value??0),1);for(const g of groups.slice(0,8)){const row=node('div',undefined,'chart-row'),label=node('div',undefined,'bar-label');label.append(node('span',g.name),node('span',C.format(g.value,metric)));const track=node('div',undefined,'bar-track'),bar=node('div',undefined,'bar');bar.style.width=Math.max(0,(g.value??0)/max*100)+'%';track.setAttribute('aria-hidden','true');track.append(bar);row.append(label,track,node('small',`${g.deals} won ${g.deals===1?'deal':'deals'}${g.deals<3?' · small sample':''}`));parent.append(row)}if(groups.length>8)parent.append(node('p',`Top 8 of ${groups.length} groups shown. Export includes all groups.`,'muted small'))}
function update(){
  if(!data.length)return;cancelAI();result=C.analyze(data,{month:$('month').value,region:$('region').value,rep:$('rep').value,product:$('product').value,metric});
  const c=result.current;
  for(const key of ['revenue','deals','average']){$(key).textContent=C.format(c[key],key);$(key+'-change').textContent=C.change(c[key],result.prior[key],result.priorAvailable,key)}
  $('win-rate').textContent=c.winRate===null?'—':(c.winRate*100).toFixed(1)+'%';
  $('scope').textContent=`${$('month').value} · ${c.rows} matching deals · ${c.open} open excluded from won metrics`;
  $('summary').textContent=result.summary;document.querySelectorAll('.chart-label').forEach(el=>el.textContent=C.METRICS[metric]);
  chart('region-chart',result.groups.region);chart('product-chart',result.groups.product);
  $('attention').replaceChildren();
  if(!c.rows)$('attention').append(node('p','No matching data. Broaden your filters.','muted small'));
  else if(!result.attention.length)$('attention').append(node('p','No rep is below the observed peer median.','muted small'));
  else {for(const g of result.attention.slice(0,5)){const row=node('div',undefined,'attention-row');row.append(node('strong',g.name),node('span',g.deals===0?'No wins':`${C.format(g.value,metric)} · below median`));$('attention').append(row)}if(result.attention.length>5)$('attention').append(node('p',`${result.attention.length-5} more reps flagged. See the full table below.`,'muted small'))}
  $('rep-table').replaceChildren();
  for(const g of result.groups.rep){const row=node('tr');for(const value of [g.name,C.format(g.revenue),g.deals,C.format(g.average),g.winRate===null?'—':(g.winRate*100).toFixed(1)+'%'])row.append(node('td',value));const flag=node('td'),review=result.attention.some(r=>r.name===g.name);flag.append(node('span',review?'Review':g.deals<3?'Small sample':'At/above median',review?'signal review':'signal'));row.append(flag);$('rep-table').append(row)}
  if(!result.groups.rep.length){const row=node('tr'),cell=node('td','No reps match this scope.');cell.colSpan=6;row.append(cell);$('rep-table').append(row)}
}
$('export').onclick=()=>{if(!result)return;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(new Blob([C.exportHTML(result,aiDraft)],{type:'text/html;charset=utf-8'}));const link=node('a');link.href=objectURL;link.download=`sales-lens-${result.options.month}.html`;document.body.append(link);link.click();link.remove();setStatus('Aggregate report downloaded. Share through your team’s approved private channel. Raw deal rows and IDs are excluded.')};
$('copy').onclick=async()=>{if(!result)return;try{await navigator.clipboard.writeText(result.summary);setStatus('Executive brief copied.')}catch{setStatus('Clipboard unavailable here. Select the brief text and copy it manually.')}};
$('ai').onclick=async()=>{
  if(!result)return;
  if(location.origin!=='http://127.0.0.1:8767'&&location.origin!=='http://localhost:8767'){$('ai-status').textContent='Use the included local server at http://127.0.0.1:8767 for local AI. Standard insights and export already work offline.';return}
  cancelAI();const ticket=generation;aiAbort=new AbortController();const controller=aiAbort;$('ai').disabled=true;$('ai-status').textContent='Asking your local model to draft a short summary…';
  const timeout=setTimeout(()=>controller.abort(),185000);
  try{
    const payload={month:result.options.month,metric:C.METRICS[metric],brief:result.summary,totals:result.current,rankings:Object.fromEntries(Object.entries(result.groups).map(([k,v])=>[k,v.map(g=>({name:g.name,value:g.value,won:g.deals}))]))};
    const response=await fetch('/api/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:$('model').value,aggregate:payload}),signal:controller.signal});const body=await response.json();if(!response.ok)throw Error(body.error||'Local AI is unavailable.');
    if(ticket!==generation)return;aiDraft=body.summary;$('ai-draft').textContent=aiDraft;$('ai-status').textContent='Local AI draft — verify against the data-derived brief before sharing. It will be included in your export.';
  }catch(error){if(ticket===generation)$('ai-status').textContent=error.name==='AbortError'?'Local AI timed out. The data-derived brief is still available.':error.message}
  finally{clearTimeout(timeout);if(ticket===generation){$('ai').disabled=false;aiAbort=null}}
};
