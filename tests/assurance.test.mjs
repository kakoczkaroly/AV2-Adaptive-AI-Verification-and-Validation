import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest, evaluate, replay } from '../framework/assurance.mjs';

const fixture = () => {
  const policy = { contract:'c@1', suite:'s@2', source:'qa-runner', expected:{ check:1 } };
  const candidate = { id:'c1', artifact:digest('build') };
  const packet = { candidate, report:{ candidate:candidate.id, artifact:candidate.artifact, contract:policy.contract,
    suite:policy.suite, source:policy.source, results:[{ id:'check', observed:1 }] } };
  return { policy, packet };
};

test('exact independent evidence is eligible, not deploy authorisation', () => {
  const { policy, packet } = fixture();
  const verdict = evaluate(packet, policy);
  assert.equal(verdict.decision, 'ELIGIBLE');
  assert.equal(verdict.deployAuthorised, false);
  assert.equal(verdict.reportDigest, digest(packet.report));
});
test('missing, failing, stale, wrong-source and duplicate results fail closed', () => {
  const { policy } = fixture();
  for (const [patch, expected] of [
    [{ artifact:digest('old') }, 'STALE_OR_WRONG_ARTIFACT'],
    [{ suite:'old' }, 'STALE_CONTRACT_OR_SUITE'],
    [{ contract:'old' }, 'STALE_CONTRACT_OR_SUITE'],
    [{ source:'builder' }, 'WRONG_EVIDENCE_SOURCE'],
    [{ results:[] }, 'REQUIRED_CHECK_NOT_PASSED'],
    [{ results:[{ id:'check', observed:0 }] }, 'REQUIRED_CHECK_NOT_PASSED'],
    [{ results:[{ id:'check', observed:1 }, { id:'check', observed:1 }] }, 'INVALID_OR_DUPLICATE_RESULT']
  ]) {
    const { packet } = fixture();
    assert.equal(evaluate({ ...packet, report:{ ...packet.report, ...patch } }, policy).reason, expected);
  }
});
test('fixture replay catches lost coverage and preserves correct behaviour', () => {
  const run = spawnSync(process.execPath, ['examples/quote-assurance.mjs'], { encoding:'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const { evidence, qaReplay } = JSON.parse(run.stdout);
  assert.equal(evidence.fresh.decision, 'ELIGIBLE');
  assert.equal(evidence.defect.decision, 'HOLD');
  assert.equal(evidence.stale.decision, 'HOLD');
  assert.deepEqual(qaReplay.baseline.caught, ['onePerAccount']);
  assert.deepEqual(qaReplay.catchesEscape.caught, ['globalDedup','onePerAccount']);
  assert.deepEqual(qaReplay.losesRegression.caught, ['globalDedup']);
  assert.equal(qaReplay.losesRegression.readyForReview, false);
  assert.equal(qaReplay.full.readyForReview, true);
  assert.equal(qaReplay.full.blocksReference, false);
  assert.deepEqual(qaReplay.full.caught, ['globalDedup','onePerAccount','countsInvalid']);
  assert.throws(() => replay({ empty:{} }, { reference:{ a:1 }, mutant:{} }, ['a'], ['mutant']), /Incomplete/);
});
test('external JSON packet uses the documented CLI and return codes', () => {
  const folder = mkdtempSync(join(tmpdir(), 'av2-'));
  try {
    const { policy, packet } = fixture();
    const files = [join(folder,'policy.json'), join(folder,'packet.json')];
    writeFileSync(files[0], JSON.stringify(policy));
    const run = () => spawnSync(process.execPath, ['framework/cli.mjs', ...files], { encoding:'utf8' });
    writeFileSync(files[1], JSON.stringify(packet));
    assert.equal(run().status, 0);
    packet.report.results = [];
    writeFileSync(files[1], JSON.stringify(packet));
    assert.equal(run().status, 2);
    writeFileSync(files[1], '{');
    assert.equal(run().status, 1);
  } finally { rmSync(folder, { recursive:true, force:true }); }
});
