import { digest, evaluate, replay } from '../framework/assurance.mjs';

const request = (account, id, valid = true) => ({ account, id, valid });
const cases = {
  retry: [request('a', '1'), request('a', '1')],
  distinct: [request('a', '1'), request('a', '2')],
  crossAccount: [request('a', '1'), request('b', '1')],
  invalid: [request('a', '1', false)]
};
const tally = (rows, key, validOnly = true) => new Set(rows.filter(r => !validOnly || r.valid).map(key)).size;
const scoped = r => JSON.stringify([r.account, r.id]);
const variants = {
  reference: rows => tally(rows, scoped),
  globalDedup: rows => tally(rows, r => r.id),
  onePerAccount: rows => tally(rows, r => r.account),
  countsInvalid: rows => tally(rows, scoped, false)
};
const expected = { retry: 1, distinct: 2, crossAccount: 2, invalid: 0 };
const suite = (...ids) => Object.fromEntries(ids.map(id => [id, expected[id]]));
const suites = {
  baseline: suite('retry', 'distinct'),
  catchesEscape: suite('retry', 'distinct', 'crossAccount'),
  losesRegression: suite('retry', 'crossAccount'),
  full: expected
};
const observations = Object.fromEntries(Object.entries(variants).map(([name, fn]) => [
  name, Object.fromEntries(Object.entries(cases).map(([id, rows]) => [id, fn(rows)]))
]));
export const policy = { contract: 'quote-counting@1', suite: 'qa@4', source: 'qa-fixture-runner', expected };
export function packetFor(name) {
  const candidate = { id: name, artifact: digest(variants[name].toString()) };
  const report = { candidate: candidate.id, artifact: candidate.artifact, contract: policy.contract,
    suite: policy.suite, source: policy.source,
    results: Object.entries(observations[name]).map(([id, observed]) => ({ id, observed })) };
  return { candidate, report };
}
export function demo() {
  const bad = packetFor('globalDedup');
  const good = packetFor('reference');
  const oldGreen = { ...bad, report: good.report };
  return {
    evidence: { fresh: evaluate(good, policy), defect: evaluate(bad, policy), stale: evaluate(oldGreen, policy) },
    qaReplay: replay(suites, observations, Object.keys(expected), Object.keys(variants).filter(id => id !== 'reference'))
  };
}
const output = process.argv[2] === '--policy' ? policy : process.argv[2] === '--packet' ? packetFor('reference') : demo();
console.log(JSON.stringify(output, null, 2));
