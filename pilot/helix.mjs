import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { evaluate } from '../framework/assurance.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rows = {
  duplicate: [['A','1',true],['A','1',true]],
  distinct: [['A','1',true],['A','2',true]],
  'cross-account': [['A','1',true],['B','1',true]],
  invalid: [['A','1',false]],
  empty: [],
};
const oracle = input => new Set(input.filter(r => r[2]).map(([account,id]) => JSON.stringify([account,id]))).size;
const variants = {
  legacy: { dedup: false, validOnly: false, scope: 'account' },
  'collapse-all': { dedup: true, validOnly: false, scope: 'global' },
  'account-dedup': { dedup: true, validOnly: false, scope: 'account' },
  'valid-account-dedup': { dedup: true, validOnly: true, scope: 'account' },
};
const turns = [
  { id:'CU-01', signal:{text:'One valid request retried using the same ID counts twice. Preserve distinct valid requests.', probe:'duplicate', expected:1, observed:2},
    challenge:['cross-account','empty','distinct'], choices:['collapse-all','account-dedup'], seed:'collapse-all' },
  { id:'CU-02', challenge:['invalid','empty','duplicate'], choices:['account-dedup','valid-account-dedup'] },
];
const program = (cfg, input) => {
  const selected = input.filter(r => !cfg.validOnly || r[2]);
  if (!cfg.dedup) return selected.length;
  if (cfg.scope === 'global') return new Set(selected.map(r => r[1])).size;
  return new Set(selected.map(r => JSON.stringify(r.slice(0,2)))).size;
};
const artifact = name => {
  if (!Object.hasOwn(variants,name)) throw new Error('Unknown build');
  const bytes = JSON.stringify(variants[name]);
  return { name, bytes, digest: hash(bytes) };
};
const inspect = (build, probes) => probes.map(id => ({ id, expected:oracle(rows[id]), observed:program(JSON.parse(build.bytes),rows[id]) }));
const clean = results => results.every(x => x.expected === x.observed);
const dataOf = Object.fromEntries(Object.entries(rows).map(([k,v]) => [k,v.length ? v.map(([a,b,c]) => a+'/'+b+(c?' valid':' invalid')).join(', ') : 'no requests']));
const baseSuite = ['duplicate','distinct'];

export async function openStage() {
  let active = artifact('legacy');
  const server = createServer((req,res) => {
    const id = new URL(req.url,'http://localhost').searchParams.get('case');
    if (req.method !== 'GET' || !Object.hasOwn(rows,id)) { res.writeHead(404).end(); return; }
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
    res.end(JSON.stringify({ digest:active.digest, observed:program(JSON.parse(active.bytes),rows[id]) }));
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  return { origin:'http://127.0.0.1:'+server.address().port,
    active:()=>active,
    activate:build=>{ if (hash(build.bytes)!==build.digest) throw new Error('Corrupted build'); active=build; },
    probe:async id=>{
      const response=await fetch('http://127.0.0.1:'+server.address().port+'/?case='+encodeURIComponent(id),{signal:AbortSignal.timeout(3000),redirect:'error'});
      if (!response.ok) throw new Error('Probe failed: '+response.status);
      return response.json();
    },
    close:async()=>{ await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())); } };
}

export function modelClient({origin='http://127.0.0.1:11434', model, seed=42}={}) {
  const url=new URL(origin);
  if (url.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
    url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw new Error('Model endpoint must be loopback HTTP');
  if (typeof model!=='string' || !model.trim()) throw new Error('Set AV2_QA_MODEL and (optionally) AV2_DELIVERY_MODEL');
  return async ({role, prompt, choices}) => {
    const schema={type:'object',properties:{reason:{type:'string'},choice:{type:'string',enum:choices}},required:['reason','choice'],additionalProperties:false};
    const r=await fetch(new URL('/v1/chat/completions',url),{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json'},
      body:JSON.stringify({model,temperature:0,seed,max_tokens:175,stream:false,
        messages:[{role:'system',content:'You are the '+role+' role in a QA experiment. Briefly explain which input matches, then copy its exact option name. Return JSON only.'},{role:'user',content:prompt}],
        response_format:{type:'json_schema',json_schema:{name:'av2_choice',strict:true,schema}}})
    });
    if (!r.ok) throw new Error(role+' model HTTP '+r.status);
    const payload=await r.json();
    const result=JSON.parse(payload.choices?.[0]?.message?.content ?? '');
    if(Object.keys(result).length!==2 || typeof result.reason!=='string' || !choices.includes(result.choice)) throw new Error(role+' model returned an invalid choice');
    return { choice:result.choice, model:payload.model ?? model };
  };
}

export async function runPilot({qa, delivery, stage, acceptStage=false, onEvent=()=>{}, verifyServing, reportFor}={}) {
  const events=[];
  const emit=(type, fields={})=>{ const event={n:events.length+1,type,...fields}; events.push(event); onEvent(event); };
  let approved=[...baseSuite];
  let signal=turns[0].signal;
  let releaseCount=0;
  for(const turn of turns) {
    if(!signal) break;
    const start=stage.active();
    const id=turn.id;
    emit('turn.started',{id,baseline:start.digest,signal});
    const challengeInput={role:'independent QA',choices:turn.challenge,
      prompt:(id==='CU-01'
        ? 'Find the option containing one request from account A and one from account B, both with request ID 1. The syntax A/1 means account A, request ID 1. Which option has exactly that input?'
        : 'The observed problem is that invalid requests count as valid. Find the test input containing an invalid request.')+
        '\nOptions:\n'+turn.challenge.map(k=>k+': '+dataOf[k]).join('\n')};
    const pending=Promise.allSettled([
      (async()=>{emit('qa.started',{id}); return qa(challengeInput);})(),
      (async()=>{emit('delivery.started',{id}); if(turn.seed) return {choice:turn.seed,model:null,controlledFault:true};
        return delivery({role:'delivery',choices:turn.choices,
          prompt:'Goal: count valid requests only. Select the option that rejects invalid requests.\naccount-dedup: accepts invalid requests.\nvalid-account-dedup: rejects invalid requests.'});})(),
    ]);
    if(releaseCount>0) {
      const sample=await stage.probe('duplicate');
      emit('monitor.concurrent',{id,probe:'duplicate',...sample,expected:oracle(rows.duplicate)});
      if(sample.digest!==start.digest||sample.observed!==oracle(rows.duplicate)) {
        await pending;
        emit('hold',{id,reason:'ACTIVE_BASELINE_DRIFT'});
        break;
      }
    }
    const [result,draft]=await pending;
    if(result.status!=='fulfilled'||draft.status!=='fulfilled'||!turn.challenge.includes(result.value?.choice)||!turn.choices.includes(draft.value?.choice)){
      emit('hold',{id,reason:'MODEL_UNAVAILABLE_OR_INVALID',details:[result,draft].filter(x=>x.status==='rejected').map(x=>String(x.reason))}); break;
    }
    // Separate policy owns the known-good behaviour and fault corpus; the bounded builder cannot edit these.
    const target=id==='CU-01'?'collapse-all':'account-dedup';
    const ref=artifact('valid-account-dedup');
    let choice=result.value;
    let qualified=null;
    for(let attempt=1;attempt<=2;attempt++) {
      const qaChoice=choice.choice;
      emit('qa.proposed',{id,attempt,model:choice.model,probe:qaChoice});
      const proposed=[...new Set([...approved,qaChoice])];
      const baselinePass=clean(inspect(ref,proposed));
      const retained=approved.every(k=>proposed.includes(k));
      const catchesTarget=!clean(inspect(artifact(target),[qaChoice]));
      if(catchesTarget&&retained&&baselinePass){
        qualified=proposed;
        emit('qa.suite.qualified',{id,probe:qaChoice,suiteDigest:hash(JSON.stringify(qualified)),retained,catchesTarget,baselinePass});
        break;
      }
      emit('qa.suite.rejected',{id,attempt,probe:qaChoice,baselinePass,retained,catchesTarget});
      if(attempt===2) break;
      try {
        const choices=turn.challenge.filter(probe=>probe!==qaChoice);
        choice=await qa({...challengeInput,choices,prompt:challengeInput.prompt+' The fixed faulty build survived '+qaChoice+'. Pick a different case from '+choices.join(', ')+'.'});
        if(!choices.includes(choice?.choice)) break;
      } catch(error) { emit('qa.retry.failed',{id,detail:String(error)});break; }
    }
    if(!qualified){emit('hold',{id,reason:'QA_SUITE_NOT_QUALIFIED'});break;}
    let selection=draft.value;
    let released=false;
    for(let attempt=1;attempt<=2;attempt++) {
      const candidate=artifact(selection.choice);
      emit('delivery.candidate',{id,attempt,build:candidate.name,digest:candidate.digest,model:selection.model,controlledFault:Boolean(selection.controlledFault)});
      const checks=inspect(candidate,qualified);
      const source='loopback-qa-pilot';
      const suite=hash(JSON.stringify(qualified));
      const contract='quote-counting@1';
      const candidateId=id+'/attempt-'+attempt;
      const report={candidate:candidateId,artifact:candidate.digest,contract,suite,source,
        results:checks.map(({id,observed})=>({id,observed}))};
      const evidence=reportFor?await reportFor(report):report;
      const policy={source,suite,contract,expected:Object.fromEntries(qualified.map(k=>[k,oracle(rows[k])]))};
      const verdict=evaluate({candidate:{id:candidateId,artifact:candidate.digest},report:evidence},policy);
      emit('qa.receipt',{id,attempt,artifact:candidate.digest,suite,...verdict});
      if(verdict.decision!=='ELIGIBLE'){
        emit('hold',{id,attempt,reason:verdict.reason});
        if(verdict.reason!=='REQUIRED_CHECK_NOT_PASSED') break;
        if(attempt===2) break;
        try {
          const choices=turn.choices.filter(name=>name!==candidate.name);
          selection=await delivery({role:'delivery',choices,prompt:
            'Independent QA rejected '+candidate.name+'. Do not submit the same artifact again. Select a new candidate that preserves per-account IDs. Allowed candidates: '+choices.join(', ')+'.'});
          if(!choices.includes(selection?.choice)) throw Error('Invalid delivery choice');
        } catch(error) {emit('hold',{id,reason:'DELIVERY_MODEL_UNAVAILABLE_OR_INVALID',detail:String(error)});break;}
        continue;
      }
      if(!acceptStage||stage.active().digest!==start.digest){
        emit('hold',{id,attempt,reason:'NO_STAGING_MANDATE_OR_STALE_BASELINE'});break;
      }
      emit('converged',{id,attempt,artifact:candidate.digest,releaseTarget:'loopback-staging'});
      stage.activate(candidate);
      try {
        for(const probe of qualified){
          const sample=await stage.probe(probe);
          if(sample.digest!==candidate.digest||sample.observed!==oracle(rows[probe]) ||
            (verifyServing && !(await verifyServing({id,probe,sample})))) throw Error('Canary mismatch: '+probe);
        }
      } catch(error) {
        stage.activate(start);
        emit('rollback',{id,reason:String(error),restored:stage.active().digest});
        return {releaseCount,events,baseline:stage.active().digest};
      }
      emit('release.staging',{id,artifact:candidate.digest,checks:qualified.length});
      releaseCount++;
      approved=qualified;
      released=true;
      break;
    }
    if(!released) break;
    const observationTurn=async (probe,text)=>{
      const sample=await stage.probe(probe);
      if(sample.digest!==stage.active().digest) throw new Error('Observation digest mismatch');
      const expected=oracle(rows[probe]);
      emit('monitor.observed',{id,probe,...sample,expected});
      return sample.observed===expected?null:{text,probe,...sample,expected};
    };
    signal=await observationTurn('invalid','Staging probe: an invalid request is counted as a valid quote.');
    if(signal&&releaseCount<turns.length) emit('monitor.opens.turn',{id,next:'CU-02',probe:signal.probe});
  }
  return {releaseCount,events,baseline:stage.active().digest};
}

export async function cli(args,env=process.env) {
  if(args.length!==1||args[0]!=='--stage') throw new Error('Usage: node pilot/run.mjs --stage (authorizes loopback staging only)');
  const qa=modelClient({origin:env.AV2_MODEL_ORIGIN,model:env.AV2_QA_MODEL});
  const delivery=modelClient({origin:env.AV2_DELIVERY_ORIGIN ?? env.AV2_MODEL_ORIGIN,model:env.AV2_DELIVERY_MODEL ?? env.AV2_QA_MODEL,seed:43});
  const stage=await openStage();
  try {
    const result=await runPilot({qa,delivery,stage,acceptStage:true,onEvent:e=>console.log(JSON.stringify(e))});
    console.log(JSON.stringify({type:'summary',releaseCount:result.releaseCount,productionDeployments:0}));
    return result.releaseCount===2?0:2;
  } finally {await stage.close();}
}
