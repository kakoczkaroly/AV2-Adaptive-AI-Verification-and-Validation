import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateRelation, relationFixture } from '../examples/cdevents-relation-assurance.mjs';

test('relation CLI: matching, stale, missing, unresolved', () => {
  assert.equal(relationFixture(17).qaEvidence.results[0].observed, 2);
  const cli = fileURLToPath(new URL('../examples/cdevents-relation-assurance.mjs', import.meta.url));
  const out = JSON.parse(execFileSync(process.execPath, [cli], { encoding:'utf8' }));
  assert.deepEqual(Object.values(out).map(x => x.decision), ['ELIGIBLE','HOLD','HOLD','HOLD']);
  assert.equal(out.matching.packagedEventId, 'package-18');
  assert.equal(out.stale.reason, 'STALE_OR_WRONG_ARTIFACT');
  assert.equal(out.missing.reason, 'MISSING_RELATION');
  assert.equal(out.unresolved.reason, 'UNRESOLVED_RELATION');
  assert(Object.values(out).every(x => x.deployAuthorised === false));
});

for (const [name, modify, reason] of [
  ['duplicate relation', x => x.finished.context.links.push(x.finished.context.links[0]), 'AMBIGUOUS_RELATION'],
  ['duplicate target', x => x.packagedEvents.push(structuredClone(x.packagedEvents[1])), 'AMBIGUOUS_TARGET'],
  ['wrong packager', x => x.packagedEvents[1].context.source='/other', 'UNRESOLVED_RELATION'],
  ['wrong event type', x => x.packagedEvents[1].context.type='other', 'INVALID_PACKAGED_EVENT'],
  ['mutable tag', x => x.packagedEvents[1].subject.id='pkg:oci/quote@latest', 'UNPINNED_ARTIFACT'],
  ['wrong suite', x => x.finished.subject.content.testSuite.version='3', 'STALE_CONTRACT_OR_SUITE'],
  ['wrong contract', x => x.qaEvidence.contract='quote@0', 'STALE_CONTRACT_OR_SUITE'],
  ['wrong execution', x => x.qaEvidence.eventId='other-finish', 'UNBOUND_QA_EVIDENCE'],
  ['wrong evidence digest', x => x.qaEvidence.artifact='a'.repeat(64), 'UNBOUND_QA_EVIDENCE'],
  ['missing required check', x => x.qaEvidence.results=[], 'REQUIRED_CHECK_NOT_PASSED'],
  ['failed suite', x => x.finished.subject.content.outcome='failure', 'TEST_SUITE_NOT_SUCCESSFUL'],
  ['wrong runner', x => x.finished.context.source='/other', 'WRONG_TEST_SOURCE'],
  ['wrong environment', x => x.finished.subject.content.environment.id='other', 'WRONG_TEST_ENVIRONMENT'],
]) test(name, () => {
  const input = relationFixture();
  modify(input);
  const result = evaluateRelation(input);
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.reason, reason);
  assert.equal(result.deployAuthorised, false);
});
