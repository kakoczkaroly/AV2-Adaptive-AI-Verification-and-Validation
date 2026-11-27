import { pathToFileURL } from 'node:url';
import { digest } from '../framework/assurance.mjs';
import { evaluateCDEvent, eventType } from '../framework/adapters/cdevents.mjs';

export function fixture() {
  const expectedEventSource = '/demo/independent-qa';
  const expectedEnvironment = 'synthetic-staging';
  const candidate = { id:'quote-build-18', artifact:digest('fictional-immutable-build-18') };
  const policy = { contract:'quote@1', suite:'qa@4', source:expectedEventSource, expected:{ distinct:2 } };
  const event = {
    context:{ specversion:'0.5.0', id:'demo-finish-18', source:expectedEventSource,
      type:eventType, timestamp:'2026-11-27T12:00:00Z' },
    subject:{ id:'demo-run-18', content:{ outcome:'success', environment:{ id:expectedEnvironment } } },
    customData:{ av2:{ format:'av2-evidence/1', run:'demo-run-18', candidate:candidate.id,
      artifact:candidate.artifact, contract:policy.contract, suite:policy.suite, results:[{ id:'distinct', observed:2 }] } }
  };
  return { candidate, event, policy, expectedEventSource, expectedEnvironment };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const current = fixture();
  const stale = structuredClone(current);
  stale.event.customData.av2.artifact = digest('fictional-immutable-build-17');
  const missing = structuredClone(current);
  delete missing.event.customData;
  console.log(JSON.stringify({ event:current.event, matching:evaluateCDEvent(current),
    stale:evaluateCDEvent(stale), missing:evaluateCDEvent(missing) }, null, 2));
}
