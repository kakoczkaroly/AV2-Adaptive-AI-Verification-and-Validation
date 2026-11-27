import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCDEvent } from '../framework/adapters/cdevents.mjs';
import { fixture } from '../examples/cdevents-assurance.mjs';

test('only matching assurance is eligible, not deploy authority', () => {
  const result = evaluateCDEvent(fixture());
  assert.equal(result.decision, 'ELIGIBLE');
  assert.equal(result.deployAuthorised, false);
  assert.equal(result.testSuiteRun, 'demo-run-18');
});
test('green events with stale, missing or wrong evidence hold', () => {
  for (const [mutate, why] of [
    [x => x.event.customData.av2.artifact = 'a'.repeat(64), 'STALE_OR_WRONG_ARTIFACT'],
    [x => x.event.customData.av2.suite = 'qa@3', 'STALE_CONTRACT_OR_SUITE'],
    [x => x.event.customData.av2.run = 'elsewhere', 'MISSING_OR_WRONG_RUN_EVIDENCE'],
    [x => delete x.event.customData, 'MISSING_OR_WRONG_RUN_EVIDENCE'],
    [x => x.event.customData.av2.results = [], 'REQUIRED_CHECK_NOT_PASSED'],
    [x => x.event.context.source = '/builder', 'WRONG_CDEVENT_SOURCE'],
    [x => x.event.subject.content.environment.id = 'elsewhere', 'WRONG_TEST_ENVIRONMENT'],
    [x => x.event.subject.content.outcome = 'error', 'TEST_SUITE_NOT_SUCCESSFUL'],
    [x => x.event.context.type = 'another.type', 'UNSUPPORTED_OR_INVALID_CDEVENT']
  ]) {
    const input = fixture();
    mutate(input);
    assert.equal(evaluateCDEvent(input).reason, why);
    assert.equal(evaluateCDEvent(input).deployAuthorised, false);
  }
});
