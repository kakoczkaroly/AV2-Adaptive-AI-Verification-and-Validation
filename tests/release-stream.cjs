const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const model=h=>h.match(/<script id="model">([\s\S]*?)<\/script>/)[1];
const stream=read('av2-release-stream.html'), detail=read('av2-loop.html');
vm.runInNewContext(model(stream)+`
const s=snapshot(24,'nominal');assert.equal(s.total,6);
const firstSix=s.rounds.filter(r=>r.id<=6);assert.equal(firstSix.length,6);
assert.equal(new Set(firstSix.map(r=>r.change)).size,6);
assert.equal(firstSix.map(r=>r.releaseTick).join(','),'4,8,12,16,20,24');
assert.equal(firstSix.every(r=>r.step===4),true);assert.equal(firstSix[5].baseline,'Release 05');
assert.equal(snapshot(5,'nominal').rounds[0].state,'MONITORING');
assert.equal(snapshot(5,'nominal').rounds[1].state,'IN PROGRESS');
assert.equal(snapshot(28,'nominal').total,7);
assert.equal(snapshot(24,'hold').total,5);
assert.equal(snapshot(24,'hold').rounds[1].state,'HOLD');
assert.equal(snapshot(24,'hold').rounds[2].released,true);assert.equal(snapshot(24,'hold').rounds[2].baseline,'Release 01');
assert.equal(exchanges.length,5);
`,{assert});
const freshness=`
function at(n,mode){let x=initial();while(n--)x=next(x,mode);return x;}
const late=at(7,'stale');assert.equal(late.revision,3);assert.equal(late.evidence.rev,2);assert.equal(late.evidence.pass,true);assert.equal(late.decision,'HOLD');assert(late.parallel>0);
const fresh=next(late,'stale');assert.equal(fresh.evidence.rev,3);assert.equal(fresh.evidence.pass,true);assert.equal(fresh.decision,'CANARY');assert.equal(at(10,'stale').cycle,2);
assert.equal(at(1,'proposal').revision,0);assert.equal(at(5,'regression').decision,'REGRESSION_BLOCK');assert.equal(at(8,'breach').decision,'ROLLBACK');
`;
vm.runInNewContext(model(detail)+freshness,{assert});
const guard='evidence?.rev===revision&&evidence.pass';assert(model(detail).includes(guard));
assert.throws(()=>vm.runInNewContext(model(detail).replace(guard,'evidence?.pass')+freshness,{assert}),/Expected values to be strictly equal/);
const elems=new Map(), make=()=>({value:'nominal',textContent:'',innerHTML:''}), el=id=>elems.get(id)||elems.set(id,make()).get(id);
let auto;
const ctx=vm.createContext({document:{getElementById:el},matchMedia:()=>({matches:false}),setInterval:f=>auto=f});
for(const m of stream.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],ctx);
for(let i=0;i<24;i++)auto();
assert.match(el('summary').textContent,/Simulated releases: 6/);
assert.match(el('rounds').innerHTML,/Turn 01/);assert.match(el('rounds').innerHTML,/Turn 06/);
el('pause').onclick();auto();assert.match(el('summary').textContent,/Tick: 24/);
console.log('Six separate releases, overlapping work, turn 07, HOLD and freshness mutation check passed.');
