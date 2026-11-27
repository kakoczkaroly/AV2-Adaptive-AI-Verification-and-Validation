import { evaluate } from '../assurance.mjs';

export const eventType = 'dev.cdevents.testsuiterun.finished.0.3.0';
const nonEmpty = x => typeof x === 'string' && x.trim().length > 0;

export function evaluateCDEvent({ candidate, event, policy, expectedEventSource, expectedEnvironment } = {}) {
  const hold = reason => ({ decision:'HOLD', reason, deployAuthorised:false });
  const { context, subject, customData } = event ?? {};
  if (context?.specversion !== '0.5.0' || context?.type !== eventType ||
      !nonEmpty(context.id) || !Number.isFinite(Date.parse(context.timestamp)) || !nonEmpty(subject?.id))
    return hold('UNSUPPORTED_OR_INVALID_CDEVENT');
  if (!nonEmpty(expectedEventSource) || context.source !== expectedEventSource ||
      (subject.source !== undefined && subject.source !== expectedEventSource))
    return hold('WRONG_CDEVENT_SOURCE');
  if (!nonEmpty(expectedEnvironment) || subject.content?.environment?.id !== expectedEnvironment)
    return hold('WRONG_TEST_ENVIRONMENT');
  if (subject.content?.outcome !== 'success') return hold('TEST_SUITE_NOT_SUCCESSFUL');
  const assurance = customData?.av2;
  if (customData?.av2?.format !== 'av2-evidence/1' || customData.av2.run !== subject.id)
    return hold('MISSING_OR_WRONG_RUN_EVIDENCE');
  const report = {
    candidate: assurance.candidate, artifact: assurance.artifact,
    contract: assurance.contract, suite: assurance.suite, source: context.source,
    results: assurance.results
  };
  return { ...evaluate({ candidate, report }, policy), eventId:context.id, testSuiteRun:subject.id };
}
