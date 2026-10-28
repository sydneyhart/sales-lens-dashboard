const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../core.js');
const header='deal_id,close_date,region,rep,product,status,amount\n';
const csv=fs.readFileSync(require('node:path').join(__dirname,'../data/sample-sales.csv'),'utf8');
const sample=C.ingest(csv);
const fixture=()=>C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,100.10\nb,2026-10-02,East,Ada,Pro,won,200.20\nc,2026-10-03,West,Bo,Basic,won,900.90\nd,2026-10-04,West,Bo,Basic,lost,9999\ne,2026-10-05,West,Cy,Basic,open,555\nf,2026-09-01,East,Ada,Pro,won,100.00');

test('synthetic fixture has 120 unique deals across 3 months, 4 regions, 8 reps and 3 products',()=>{
 assert.equal(sample.length,120);assert.equal(new Set(sample.map(r=>r.deal_id)).size,120);
 for(const [key,count]of [['month',3],['region',4],['rep',8],['product',3]])assert.equal(new Set(sample.map(r=>r[key])).size,count);
});
test('sample October and September totals match independently recorded expected values',()=>{
 const r=C.analyze(sample,{month:'2026-10'});assert.equal(r.current.revenue,19579250);assert.equal(r.current.deals,22);assert.equal(r.current.rows,40);assert.equal(r.current.open,8);assert.equal(r.current.winRate,22/32);assert.equal(r.prior.revenue,20196000);assert.equal(r.prior.deals,24);
});
test('weighted average and win rate exclude open and lost deal amounts',()=>{
 const r=C.analyze(fixture(),{month:'2026-10'});assert.equal(r.current.revenue,120120);assert.equal(r.current.deals,3);assert.equal(r.current.average,40040);assert.equal(r.current.winRate,3/4);
 assert.notEqual(r.current.average,(15015+90090)/2);
});
test('all three metric rankings use their own correctly ordered values',()=>{
 const d=fixture();assert.equal(C.analyze(d,{month:'2026-10',metric:'revenue'}).groups.rep[0].name,'Bo');assert.equal(C.analyze(d,{month:'2026-10',metric:'deals'}).groups.rep[0].name,'Ada');assert.equal(C.analyze(d,{month:'2026-10',metric:'average'}).groups.rep[0].name,'Bo');
});
test('filters scope current and previous months identically',()=>{
 const r=C.analyze(fixture(),{month:'2026-10',region:'East',rep:'Ada',product:'Pro'});assert.equal(r.current.deals,2);assert.equal(r.prior.deals,1);assert.equal(r.prior.revenue,10000);
});
test('missing prior data differs from an explicit zero prior month',()=>{
 const d=fixture();let r=C.analyze(d,{month:'2026-10',rep:'Bo'});assert.equal(r.priorAvailable,false);assert.equal(C.change(100,0,false,'revenue'),'No prior-month data');
 d.push(...C.ingest(header+'g,2026-09-01,West,Bo,Basic,lost,100'));
 r=C.analyze(d,{month:'2026-10',rep:'Bo'});assert.equal(r.priorAvailable,true);assert.equal(C.change(100,0,true,'revenue'),'From $0.00 last month');
});
test('calendar comparisons handle January rollover and leap dates',()=>{
 assert.equal(C.previousMonth('2026-01'),'2025-12');assert.equal(C.validDate('2024-02-29'),true);for(const x of ['2026-02-29','2026-04-31','2026-13-01','2026-1-01','1800-01-01'])assert.equal(C.validDate(x),false,x);
});
test('CSV parser supports quoted commas, embedded newlines, escaped quotes, BOM, CRLF and TSV',()=>{
 assert.deepEqual(C.parseCSV('a,b\r\n"x,y","two ""quotes""\nlines"\r\n'),[['a','b'],['x,y','two "quotes"\nlines']]);
 assert.deepEqual(C.parseCSV('\ufeffa\tb\nx\ty'),[['a','b'],['x','y']]);
});
test('CSV malformed quotes and column counts are rejected',()=>{
 for(const bad of ['a\n"unclosed','a\nabc"x','a\n"x" bad'])assert.throws(()=>C.parseCSV(bad));
 assert.throws(()=>C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,10,extra'),/column count/);
});
test('missing and duplicate normalized headers are rejected',()=>{
 assert.throws(()=>C.ingest('deal_id,amount\na,5'),/Missing columns/);assert.throws(()=>C.ingest(header.trim()+', Amount\na,b,c,d,e,f,g,h'),/Duplicate column/);
});
test('duplicate deal IDs reject entire import rather than silently double count',()=>{
 assert.throws(()=>C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,10\na,2026-10-02,East,Ada,Pro,won,20'),/duplicate deal_id/);
});
test('invalid status, date, blank required fields and excessive labels reject import',()=>{
 for(const row of ['a,2026-10-01,East,Ada,Pro,pending,10','a,2026-02-30,East,Ada,Pro,won,10','a,2026-10-01,,Ada,Pro,won,10',`a,2026-10-01,${'x'.repeat(121)},Ada,Pro,won,10`])assert.throws(()=>C.ingest(header+row));
});
test('amounts reject negatives, infinity, symbols, exponents, fractions and unsafe integers',()=>{
 for(const amount of ['-1','Infinity','$15','1e4','1.123','9999999999999999','1,000'])assert.throws(()=>C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,'+amount));
 const d=C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,0.10\nb,2026-10-01,East,Ada,Pro,won,0.20');assert.equal(C.totals(d).revenue,30);
});
test('file and record limits are enforced',()=>{
 assert.throws(()=>C.ingest('x'.repeat(2_000_001)),/2 MB/);
 const rows=Array.from({length:10001},(_,i)=>`${i},2026-10-01,East,Ada,Pro,won,1`);assert.throws(()=>C.ingest(header+rows.join('\n')),/10,000/);
});
test('empty filters and zero wins produce defined empty states, not NaN',()=>{
 const r=C.analyze(fixture(),{month:'2026-10',region:'None'});assert.equal(r.current.rows,0);assert.equal(r.current.average,null);assert.equal(r.current.winRate,null);assert.match(r.summary,/No deals match/);assert.doesNotMatch(C.exportHTML(r),/NaN|Infinity/);
 const z=C.analyze(fixture(),{month:'2026-10',rep:'Cy'});assert.equal(z.current.deals,0);assert.equal(z.current.average,null);assert.equal(z.attention[0].name,'Cy');assert.doesNotMatch(z.summary,/Leading rep/);
});
test('ties are reported jointly and no quota inference is made',()=>{
 const r=C.analyze(fixture(),{month:'2026-10',metric:'deals'});assert.match(r.summary,/Leading rep.*Ada/);assert.match(r.summary,/not quota attainment/);
 const t=C.analyze(C.ingest(header+'a,2026-10-01,East,Ada,Pro,won,10\nb,2026-10-01,West,Bo,Pro,won,10'),{month:'2026-10'});assert.match(t.summary,/Leading regions.*East and West/);
});
test('median flags below-median reps and includes no-win reps without inventing quotas',()=>{
 const r=C.analyze(fixture(),{month:'2026-10'});assert.deepEqual(r.attention.map(g=>g.name),['Cy']);assert.equal(r.threshold,30030);assert.equal(C.median([null,10,20]),15);
});
test('report includes aggregates and escapes hostile labels and AI output',()=>{
 const r=C.analyze(fixture(),{month:'2026-10'});r.groups.rep[0].name='<script>alert(1)</script>';const html=C.exportHTML(r,'<img src=x onerror=alert(2)>');assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('Local AI draft'));assert.ok(html.includes('default-src'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('deal_id'));assert.ok(!html.includes('2026-10-01'));
});
test('input rows are not mutated by analysis and extra customer columns are not retained',()=>{
 const d=fixture(),before=JSON.stringify(d);C.analyze(d,{month:'2026-10'});assert.equal(JSON.stringify(d),before);
 const x=C.ingest(header.trim()+',customer_email\na,2026-10-01,East,Ada,Pro,won,10,private@example.org');assert.equal(x[0].customer_email,undefined);
});
test('invalid metric and reporting month reject analysis',()=>{
 for(const metric of ['__proto__','toString','profit'])assert.throws(()=>C.analyze(sample,{month:'2026-10',metric}));assert.throws(()=>C.analyze(sample,{month:'2026-13'}));
});
