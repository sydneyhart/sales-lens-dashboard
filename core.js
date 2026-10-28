(function (root) {
  'use strict';
  const HEADERS = ['deal_id','close_date','region','rep','product','status','amount'];
  const METRICS = { revenue:'Won revenue', deals:'Deals won', average:'Average won deal' };
  function parseCSV(input) {
    const text = input.replace(/^\uFEFF/, '');
    const delimiter = text.split(/\r?\n/)[0].includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cell = '', quoted = false, afterQuote = false;
    const endCell = () => { row.push(cell); cell = ''; afterQuote = false; };
    const endRow = () => { endCell(); if (row.some(x => x.trim())) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i+1] === '"') { cell += '"'; i++; }
        else if (char === '"') { quoted = false; afterQuote = true; }
        else cell += char;
      } else if (char === delimiter) endCell();
      else if (char === '\n' || char === '\r') { if (char === '\r' && text[i+1] === '\n') i++; endRow(); }
      else if (char === '"') { if (cell || afterQuote) throw Error('Malformed quote in CSV. Re-export as CSV UTF-8.'); quoted = true; }
      else { if (afterQuote) throw Error('Unexpected content after a quoted CSV value.'); cell += char; }
    }
    if (quoted) throw Error('Unclosed quote in CSV.');
    if (cell || row.length || afterQuote) endRow();
    return rows;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value && +value.slice(0,4) >= 1900;
  }
  function ingest(text) {
    if (new TextEncoder().encode(text).length > 2_000_000) throw Error('Maximum upload size is 2 MB.');
    const records = parseCSV(text); if (records.length < 2) throw Error('Include headers and at least one deal.');
    const headers = records.shift().map(s=>s.trim().toLowerCase());
    if (new Set(headers).size !== headers.length) throw Error('Duplicate column headers are not allowed.');
    const missing = HEADERS.filter(h=>!headers.includes(h));
    if (missing.length) throw Error('Missing columns: '+missing.join(', '));
    if (records.length > 10000) throw Error('Use at most 10,000 deals per upload.');
    const ids = new Set(); let total = 0;
    return records.map((record,index)=>{
      const fail = message => { throw Error(`Record ${index+2}: ${message}`); };
      if (record.length !== headers.length) fail('column count does not match the header.');
      const row = Object.fromEntries(headers.map((h,i)=>[h,record[i].trim()]));
      for (const h of HEADERS) if (!row[h] || row[h].length > 120) fail(`${h} must contain 1–120 characters.`);
      if (ids.has(row.deal_id)) fail(`duplicate deal_id ${row.deal_id}.`); ids.add(row.deal_id);
      if (!validDate(row.close_date)) fail('close_date must be a real date in YYYY-MM-DD format (1900 or later).');
      row.status = row.status.toLowerCase();
      if (!['won','lost','open'].includes(row.status)) fail('status must be won, lost, or open.');
      if (!/^\d+(\.\d{1,2})?$/.test(row.amount)) fail('amount must be a nonnegative USD number, without commas or currency symbols, with at most 2 decimals.');
      const [dollars, fraction=''] = row.amount.split('.');
      row.cents = Number(dollars)*100 + Number(fraction.padEnd(2,'0'));
      total += row.cents;
      if (!Number.isSafeInteger(row.cents) || !Number.isSafeInteger(total)) fail('amounts exceed safe numeric limits.');
      row.month = row.close_date.slice(0,7);
      return Object.fromEntries([...HEADERS.map(h=>[h,row[h]]),['cents',row.cents],['month',row.month]]);
    });
  }
  function totals(rows) {
    const won = rows.filter(r=>r.status==='won'), lost=rows.filter(r=>r.status==='lost');
    const revenue=won.reduce((n,r)=>n+r.cents,0);
    return {revenue,deals:won.length,average:won.length?revenue/won.length:null,winRate:won.length+lost.length?won.length/(won.length+lost.length):null,open:rows.filter(r=>r.status==='open').length,rows:rows.length};
  }
  function ranks(rows, dimension, metric) {
    const groups = new Map();
    for (const r of rows) { if (!groups.has(r[dimension])) groups.set(r[dimension],[]); groups.get(r[dimension]).push(r); }
    return [...groups].map(([name,group])=>({name,...totals(group)})).map(g=>({...g,value:g[metric]}))
      .sort((a,b)=>(b.value??-1)-(a.value??-1)||a.name.localeCompare(b.name));
  }
  function median(values) { const v=values.filter(n=>n!==null).sort((a,b)=>a-b); const m=Math.floor(v.length/2);return v.length?(v.length%2?v[m]:(v[m-1]+v[m])/2):null; }
  function previousMonth(month) { const [year,m]=month.split('-').map(Number);return `${m===1?year-1:year}-${String(m===1?12:m-1).padStart(2,'0')}`; }
  function format(value,metric='revenue') {
    if (value===null || value===undefined) return '—';
    return metric==='deals'?new Intl.NumberFormat('en-US').format(value):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value/100);
  }
  function change(current,prior,available,metric) {
    if (!available) return 'No prior-month data';
    if (current===null || prior===null) return 'No comparable won deals';
    if (prior===0) return current===0?'No change from zero':`From ${format(0,metric)} last month`;
    const pct=(current-prior)/prior*100;
    return `${pct>0?'+':''}${pct.toFixed(1)}% vs prior month`;
  }
  function analyze(data,options) {
    const {month,metric='revenue',region='',rep='',product=''}=options;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Object.hasOwn(METRICS,metric)) throw Error('Select a valid month and metric.');
    const scoped=data.filter(r=>(!region||r.region===region)&&(!rep||r.rep===rep)&&(!product||r.product===product));
    const rows=scoped.filter(r=>r.month===month),priorRows=scoped.filter(r=>r.month===previousMonth(month));
    const current=totals(rows),prior=totals(priorRows),groups=Object.fromEntries(['region','rep','product'].map(d=>[d,ranks(rows,d,metric)]));
    const threshold=median(groups.rep.map(g=>g.value));
    const attention=groups.rep.filter(g=>g.deals===0||(g.value!==null&&g.value<threshold));
    const result={options:{month,metric,region,rep,product},current,prior,priorAvailable:priorRows.length>0,groups,attention,threshold};
    result.summary=brief(result);return result;
  }
  function leaders(groups,metric) {
    if (!groups.length || groups[0].value===null || groups[0].deals===0) return null;
    const ties=groups.filter(g=>g.value===groups[0].value).map(g=>g.name);
    return `${names(ties)} (${format(groups[0].value,metric)})`;
  }
  function names(values) { return values.length<=2?values.join(' and '):`${values.slice(0,2).join(', ')} and ${values.length-2} others`; }
  function brief(result) {
    const {options:o,current:c,prior:p,priorAvailable,groups,attention}=result;
    if (!c.rows) return 'No deals match these filters. Choose a different month or broaden the scope.';
    const opening=`${o.month}: ${c.deals} deals won generated ${format(c.revenue)}; the average won deal was ${format(c.average)}. ${change(c.revenue,p.revenue,priorAvailable,'revenue')}.`;
    const parts=[opening];
    for (const dimension of ['region','rep','product']) { const top=leaders(groups[dimension],o.metric); if (top) parts.push(`Leading ${dimension}${groups[dimension].filter(g=>g.value===groups[dimension][0].value).length>1?'s':''} by ${METRICS[o.metric].toLowerCase()}: ${top}.`); }
    if(attention.length)parts.push(`Review ${names(attention.map(g=>g.name))}: no wins or below the observed rep median for ${METRICS[o.metric].toLowerCase()}. This is a peer comparison, not quota attainment.`);
    else parts.push('No rep is below the observed peer median for this metric.');
    return parts.join(' ');
  }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function exportHTML(result,ai='') {
    const o=result.options, c=result.current;
    const sections=Object.entries(result.groups).map(([dimension,rows])=>`<h2>By ${dimension}</h2><table><thead><tr><th>${dimension}</th><th>${escape(METRICS[o.metric])}</th><th>Won revenue (USD)</th><th>Deals won</th><th>Average won deal (USD)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.name)}</td><td>${escape(format(r.value,o.metric))}</td><td>${format(r.revenue)}</td><td>${r.deals}</td><td>${format(r.average)}</td></tr>`).join('')}</tbody></table>`).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Sales Lens · ${escape(o.month)}</title><style>body{max-width:960px;margin:45px auto;padding:0 22px;font:16px/1.6 system-ui;color:#20332e}h1,h2{color:#1b594a}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}small{color:#65736b}@media print{h2{break-after:avoid}tr{break-inside:avoid}}</style><h1>Sales Lens · Monthly review</h1><p>Month: ${escape(o.month)} · Region: ${escape(o.region||'All')} · Rep: ${escape(o.rep||'All')} · Product: ${escape(o.product||'All')} · Metric: ${escape(METRICS[o.metric])}</p><p>${c.rows} matching deals · Revenue is won deal value in USD, not recognized revenue or ARR.</p><h2>Data-derived executive brief</h2><p>${escape(result.summary)}</p>${ai?`<h2>Local AI draft — review before sharing</h2><p>${escape(ai)}</p>`:''}${sections}<p><small>Average = sum of won deal values / won deal count. Win rate = won / (won + lost); open deals excluded. Peer flags are not quota judgments. Excludes raw deal rows and IDs; grouped names and values remain confidential. Share only with authorized colleagues.</small></p></html>`;
  }
  const api={HEADERS,METRICS,parseCSV,validDate,ingest,totals,ranks,median,previousMonth,format,change,analyze,brief,exportHTML,escape};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SalesCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
