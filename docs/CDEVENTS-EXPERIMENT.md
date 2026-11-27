# Bind a green test event to the tested build

A test suite can report success, yet that result might belong to a different build. This offline AV² experiment uses the CDEvents v0.5.0 [testSuiteRun finished event](https://github.com/cdevents/spec/blob/v0.5.0/testing-events.md#testsuiterun-finished) as a signal and checks a small AV²-specific evidence extension before returning eligibility.

```sh
node examples/cdevents-assurance.mjs
node --test tests/cdevents.test.mjs
```

| Local sample | Suite outcome | AV² decision |
| --- | --- | --- |
| Required checks for the requested artifact, run, contract and suite | success | ELIGIBLE |
| A green result referencing another artifact digest | success | HOLD |
| No independent assurance evidence | success | HOLD |

The candidate digest comes from the proposed build, outside the event. The declared test run and evidence refer to the artifact actually tested. For the experiment, the run ID, SHA-256, contract/suite versions and observed results live under `customData.av2`. This is a **private extension**, not a proposal to put release authority into CDEvents. The input follows the official [tagged fixture](https://github.com/cdevents/spec/blob/v0.5.0/conformance/testsuiterun_finished.json) using `context.specversion`. The tagged [generated schema](https://github.com/cdevents/spec/blob/v0.5.0/schemas/testsuiterunfinished.json) lists `version` in its required array instead. The adapter checks a small local subset and makes **no CDEvents schema-conformance claim**.

This demo has no broker, CI credentials, customer data, network calls or deployment authority. A matching source label is not authenticated provenance. Before using this pattern in CI, independently authenticate producer and receipt, keep policy protected, pin artifact identity and add replay protection; this local adapter does not implement those checks.

**Feedback wanted:** Is there an existing interoperable way to link a suite run to the exact artifact it tested and the immutable report: an artifact-event relation plus a report reference, or a different existing pattern? If your pipeline already does this, an anonymised event pair or example producer would help. Broader QA design feedback is welcome in the [AV² RFC](https://github.com/kakoczkaroly/AV2-Adaptive-AI-Verification-and-Validation/issues/2).
