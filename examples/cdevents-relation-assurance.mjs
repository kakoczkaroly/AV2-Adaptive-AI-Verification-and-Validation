import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { evaluate } from '../framework/assurance.mjs';

const suiteFinished = 'dev.cdevents.testsuiterun.finished.0.3.0';
const artifactPackaged = 'dev.cdevents.artifact.packaged.0.3.0';
const digestPurl = /^pkg:oci\/[a-z0-9]+(?:[._-][a-z0-9]+)*@sha256%3[aA]([0-9a-f]{64})$/;
const present = x => typeof x === 'string' && x.trim().length > 0;
const validEvent = (event, type, kind) => event?.context?.specversion === '0.5.0' &&
  event.context.type === type && present(event.context.id) && present(event.context.source) &&
  Number.isFinite(Date.parse(event.context.timestamp)) && event.subject?.type === kind &&
  present(event.subject.id) &&
  (event.subject.source === undefined || event.subject.source === event.context.source);
const hold = reason => ({ decision: 'HOLD', reason, deployAuthorised: false });

export function evaluateRelation({ candidate, finished, packagedEvents, qaEvidence,
  policy, packagerSource, testEnvironment } = {}) {
  if (!validEvent(finished, suiteFinished, 'testSuiteRun')) return hold('INVALID_TEST_EVENT');
  const { context, subject } = finished;
  if (!present(policy?.source) || context.source !== policy.source) return hold('WRONG_TEST_SOURCE');
  if (!present(testEnvironment) || subject.content?.environment?.id !== testEnvironment)
    return hold('WRONG_TEST_ENVIRONMENT');
  if (subject.content.outcome !== 'success') return hold('TEST_SUITE_NOT_SUCCESSFUL');

  // ARTIFACT is this demo's agreed linkKind, not a required cross-producer vocabulary.
  const relations = Array.isArray(context.links) ? context.links.filter(
    link => link?.linkType === 'RELATION' && link.linkKind === 'ARTIFACT') : [];
  if (relations.length !== 1) return hold(relations.length ? 'AMBIGUOUS_RELATION' : 'MISSING_RELATION');
  const targetId = relations[0].target?.contextId;
  if (!present(targetId) || !present(packagerSource) || !Array.isArray(packagedEvents))
    return hold('UNRESOLVED_RELATION');
  const matches = packagedEvents.filter(e => e?.context?.id === targetId &&
    e.context.source === packagerSource);
  if (matches.length !== 1) return hold(matches.length ? 'AMBIGUOUS_TARGET' : 'UNRESOLVED_RELATION');
  const packaged = matches[0];
  if (!validEvent(packaged, artifactPackaged, 'artifact') || !present(packaged.subject.content?.change?.id))
    return hold('INVALID_PACKAGED_EVENT');
  const artifact = digestPurl.exec(packaged.subject.id)?.[1];
  if (!artifact) return hold('UNPINNED_ARTIFACT');

  const { id, version } = subject.content.testSuite ?? {};
  if (!present(id) || !present(version) || id.includes('@') || version.includes('@'))
    return hold('INVALID_SUITE_METADATA');
  // Separate local AV² evidence. Bind it to this exact finish event AND artifact.
  if (qaEvidence?.eventId !== context.id || qaEvidence.source !== context.source ||
    qaEvidence.run !== subject.id || qaEvidence.artifact !== artifact)
    return candidate?.artifact !== artifact ? hold('STALE_OR_WRONG_ARTIFACT') : hold('UNBOUND_QA_EVIDENCE');
  const report = { candidate: qaEvidence.candidate, artifact, contract: qaEvidence.contract,
    suite: `${id}@${version}`, source: qaEvidence.source, results: qaEvidence.results };
  return { ...evaluate({ candidate, report }, policy), testEventId: context.id, packagedEventId: targetId };
}

export function relationFixture(testedBuild = 18) {
  const testSource = '/demo/independent-qa';
  const packagerSource = '/demo/packager';
  const testEnvironment = 'synthetic-staging';
  const inputs = { 17: ['quote', 'quote-old'], 18: ['quote', 'quote-2'] };
  const bytes = n => Buffer.from(JSON.stringify(inputs[n]));
  const sha = n => createHash('sha256').update(bytes(n)).digest('hex');
  const chainId = 'demo-quote';
  const eventContext = (id, source, type, time) => ({ specversion:'0.5.0', chainId,
    id, source, type, timestamp:`2026-11-28T12:00:${time}Z` });
  const packagedEvents = [17,18].map(n => ({
    context: eventContext(`package-${n}`, packagerSource, artifactPackaged, '00'),
    subject: { type:'artifact', id:`pkg:oci/quote@sha256%3A${sha(n)}`,
      content:{ change:{ id:`fictional-revision-${n}`, source:'/demo/quote' } } },
  }));
  const finished = {
    context: { ...eventContext(`finish-${testedBuild}`, testSource, suiteFinished, '01'),
      links: [{ chainId, linkType:'RELATION', linkKind:'ARTIFACT',
        target:{ contextId:`package-${testedBuild}` } }] },
    subject: { type:'testSuiteRun', id:`run-${testedBuild}`,
      content: { outcome:'success', environment:{ id:testEnvironment }, testSuite:{ id:'qa', version:'4' } } },
  };
  return {
    candidate:{ id:'quote-build-18', artifact:sha(18) }, finished, packagedEvents,
    policy:{ contract:'quote@1', suite:'qa@4', source:testSource, expected:{ distinct:2 } },
    qaEvidence:{ eventId:finished.context.id, source:testSource, run:finished.subject.id,
      artifact:sha(testedBuild), candidate:`quote-build-${testedBuild}`, contract:'quote@1',
      results:[{ id:'distinct', observed:new Set(JSON.parse(bytes(testedBuild))).size }] },
    packagerSource, testEnvironment,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const matching = relationFixture();
  const stale = relationFixture(17);
  const missing = structuredClone(matching);
  delete missing.finished.context.links;
  const unresolved = structuredClone(matching);
  unresolved.finished.context.links[0].target.contextId = 'unseen-package';
  console.log(JSON.stringify(Object.fromEntries(Object.entries({ matching, stale, missing, unresolved })
    .map(([label, input]) => [label, evaluateRelation(input)])), null, 2));
}
