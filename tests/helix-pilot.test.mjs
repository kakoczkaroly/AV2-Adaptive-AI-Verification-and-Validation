import test from 'node:test';
import assert from 'node:assert/strict';
import {openStage, runPilot, modelClient} from '../pilot/helix.mjs';

// These injected fixtures test orchestration; they do not prove model inference.
const qa=async ({choices})=>({choice:choices.includes('cross-account')?'cross-account':'invalid',model:'fixture'});
const delivery=async ({choices})=>({choice:choices.at(-1),model:'fixture'});
const withStage=async fn=>{
  const stage=await openStage();
  try {await fn(stage);} finally {await stage.close();}
};
test('two real HTTP releases with retained checks and observation-triggered turn',()=>withStage(async stage=>{
  const run=await runPilot({qa,delivery,stage,acceptStage:true});
  assert.equal(run.releaseCount,2);
  const e=run.events;
  assert.deepEqual(e.filter(x=>x.type==='release.staging').map(x=>[x.id,x.checks]),[['CU-01',3],['CU-02',4]]);
  assert.equal(e.find(x=>x.type==='hold').reason,'REQUIRED_CHECK_NOT_PASSED');
  assert.equal(e.find(x=>x.type==='monitor.opens.turn').next,'CU-02');
  const observed=e.filter(x=>x.type==='monitor.observed');
  assert.deepEqual(observed.map(x=>[x.observed,x.expected]),[[1,0],[0,0]]);
  const second=e.filter(x=>x.id==='CU-02');
  assert.ok(second.find(x=>x.type==='monitor.concurrent').n<second.find(x=>x.type==='qa.proposed').n);
  assert.equal((await stage.probe('invalid')).observed,0);
  assert.deepEqual(e.filter(x=>x.type==='qa.receipt').at(-1).checks.map(x=>x.id),['duplicate','distinct','cross-account','invalid']);
}));
test('a model-proposed check that misses the fault cannot qualify',()=>withStage(async stage=>{
  const run=await runPilot({qa:async()=>({choice:'empty'}),delivery,stage,acceptStage:true});
  assert.equal(run.releaseCount,0);
  assert.equal(run.events.at(-1).reason,'QA_SUITE_NOT_QUALIFIED');
  assert.equal(stage.active().name,'legacy');
}));
test('provider outage fails closed',()=>withStage(async stage=>{
  const run=await runPilot({qa:async()=>{throw Error('offline');},delivery,stage,acceptStage:true});
  assert.equal(run.releaseCount,0);
  assert.equal(run.events.at(-1).reason,'MODEL_UNAVAILABLE_OR_INVALID');
}));
test('no staging authorization means no promotion',()=>withStage(async stage=>{
  const run=await runPilot({qa,delivery,stage});
  assert.equal(run.releaseCount,0);
  assert.equal(run.events.at(-1).reason,'NO_STAGING_MANDATE_OR_STALE_BASELINE');
}));
test('failed HTTP canary rolls back to the previous artifact',()=>withStage(async stage=>{
  const before=await stage.probe('duplicate');
  const run=await runPilot({qa,delivery,stage,acceptStage:true,verifyServing:()=>false});
  assert.equal(run.releaseCount,0);
  assert.equal(run.events.at(-1).type,'rollback');
  assert.deepEqual(await stage.probe('duplicate'),before);
}));
test('model endpoint cannot target a remote origin',()=>{
  assert.throws(()=>modelClient({origin:'https://example.com',model:'x'}),/loopback/);
});
test('a green receipt bound to a different digest never activates a candidate',()=>withStage(async stage=>{
  const reportFor=report=>({...report,artifact:'a'.repeat(64),results:report.results.map(r=>r.id==='cross-account'?{...r,observed:2}:r)});
  const run=await runPilot({qa,delivery,stage,acceptStage:true,reportFor});
  assert.equal(run.releaseCount,0);
  assert.equal(run.events.at(-1).reason,'STALE_OR_WRONG_ARTIFACT');
  assert.equal(stage.active().name,'legacy');
}));
