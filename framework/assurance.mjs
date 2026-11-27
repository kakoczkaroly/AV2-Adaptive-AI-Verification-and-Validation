import { createHash, timingSafeEqual } from 'node:crypto';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
const token = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

// In the pilot, policy and report files must come from a trusted QA context.
// Digests identify artefacts; they do not authenticate their source.
export function evaluate(packet, policy) {
  const hold = (reason, checks = []) => ({
    decision: 'HOLD', reason, checks, deployAuthorised: false
  });
  if (!isRecord(packet) || !isRecord(policy) || !isRecord(policy.expected) ||
     !identifier(policy.contract) || !identifier(policy.suite) || !identifier(policy.source) ||
     !Object.keys(policy.expected).length ||
     !Object.values(policy.expected).every(Number.isSafeInteger)) return hold('INVALID_POLICY_OR_INPUT');
  const { candidate, report } = packet;
  if (!isRecord(candidate) || !identifier(candidate.id) || !token(candidate.artifact)) return hold('INVALID_CANDIDATE');
  if (!isRecord(report) || !Array.isArray(report.results)) return hold('MISSING_REPORT');
  if (report.candidate !== candidate.id || !token(report.artifact) ||
    !timingSafeEqual(Buffer.from(report.artifact), Buffer.from(candidate.artifact))) return hold('STALE_OR_WRONG_ARTIFACT');
  if (report.contract !== policy.contract || report.suite !== policy.suite) return hold('STALE_CONTRACT_OR_SUITE');
  if (report.source !== policy.source) return hold('WRONG_EVIDENCE_SOURCE');
  const entries = new Map();
  for (const row of report.results) {
    if (!isRecord(row) || !identifier(row.id) || !Number.isSafeInteger(row.observed) || entries.has(row.id))
      return hold('INVALID_OR_DUPLICATE_RESULT');
    entries.set(row.id, row.observed);
  }
  const checks = Object.entries(policy.expected).map(([id, expected]) => ({
    id, expected, observed: entries.get(id) ?? null,
    status: !entries.has(id) ? 'MISSING' : entries.get(id) === expected ? 'PASS' : 'FAIL'
  }));
  if (checks.some(x => x.status !== 'PASS')) return hold('REQUIRED_CHECK_NOT_PASSED', checks);
  return {
    decision: 'ELIGIBLE', candidate: candidate.id, artifact: candidate.artifact,
    contract: policy.contract, suite: policy.suite, reportDigest: digest(report),
    checks, deployAuthorised: false
  };
}

// Both suites evaluate the same validated replay matrix. The reviewer owns the
// required QA cases and must still approve any promotion outside this function.
export function replay(suites, observations, requiredCases, mustDetect) {
  const good = observations.reference;
  if (!isRecord(good) || !requiredCases.length || !mustDetect.length ||
      !requiredCases.every(id => Object.hasOwn(good, id)) ||
      !mustDetect.every(id => id !== 'reference' && Object.hasOwn(observations, id)))
    throw new Error('Invalid replay reference or promotion criteria');
  const referenceIds = Object.keys(good);
  for (const row of Object.values(observations))
    if (!isRecord(row) || !referenceIds.every(id => Object.hasOwn(row, id) && Number.isSafeInteger(row[id])))
      throw new Error('Incomplete or invalid replay matrix');
  const outcomes = Object.create(null);
  for (const [version, cases] of Object.entries(suites)) {
    if (!isRecord(cases) || Object.entries(cases).some(([id, value]) => !Object.hasOwn(good, id) || !Number.isSafeInteger(value)))
      throw new Error('Invalid suite case');
    const missed = requiredCases.filter(id => !Object.hasOwn(cases, id));
    const blocksReference = Object.entries(cases).some(([id, expected]) => good[id] !== expected);
    const caught = Object.entries(observations)
      .filter(([name, row]) => name !== 'reference' && Object.entries(cases).some(([id, expected]) => row[id] !== expected))
      .map(([name]) => name);
    outcomes[version] = { missed, caught, blocksReference,
      readyForReview: !missed.length && !blocksReference && mustDetect.every(name => caught.includes(name)) };
  }
  return outcomes;
}
