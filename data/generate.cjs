// Original synthetic fixture. No customer or employee data.
const fs=require('node:fs');const path=require('node:path');
const reps=[['North America','Alex Morgan'],['North America','Jordan Lee'],['Europe','Sam Rivera'],['Europe','Taylor Chen'],['Asia Pacific','Casey Blake'],['Asia Pacific','Avery Quinn'],['Latin America','Riley Park'],['Latin America','Morgan Reed']];
const products=['Analytics Pro','Workflow Cloud','Support Hub'];
const rows=['deal_id,close_date,region,rep,product,status,amount'];let id=0;
for(let month=8;month<=10;month++)for(let r=0;r<reps.length;r++)for(let d=0;d<5;d++){
 const [region,rep]=reps[r],status=d===4?'open':d===3||(r===5&&month===10&&d>0)?'lost':'won';
 const amount=((8-r)*1250+(d+1)*900+(month-8)*(r<4?650:-200))*(d%2?1:1.15);
 rows.push([`DEAL-${String(++id).padStart(4,'0')}`,`2026-${String(month).padStart(2,'0')}-${String(3+d*5+r%3).padStart(2,'0')}`,region,rep,products[(r+d)%3],status,amount.toFixed(2)].join(','));
}
const csv=rows.join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'sample-sales.csv'),csv);
fs.writeFileSync(path.join(__dirname,'sample.js'),'/* Synthetic sample, loaded only on request. */\nwindow.SAMPLE_CSV='+JSON.stringify(csv)+';\n');
const C=require('../core.js');
fs.mkdirSync(path.join(__dirname,'../examples'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../examples/monthly-report.html'),C.exportHTML(C.analyze(C.ingest(csv),{month:'2026-10'})));
