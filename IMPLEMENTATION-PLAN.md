# AV² v0.1 · Implementation plan

## Problem
When one AI workflow translates an unverified assumption into a requirement, code and tests, a green build can confirm that assumption instead of challenging it. AV² keeps delivery and assurance separate, joins them at an evidence gate, and feeds production observations into the next cycle.

**Reference case:** a fictional mobile quote form. Retrying a successful submission must not create a second valid lead. The product hypothesis is more unique qualified leads per eligible visitor, not more submit-click events. No customer data or real deployment is required for the pilot.

## Delivery and assurance, side by side

| Stage | Delivery | Independent assurance | Exit evidence |
|---|---|---|---|
| 1. Intent | Summarise benchmark and propose one small change. | Challenge the benchmark, baseline and target audience; identify what could falsify the hypothesis. | Versioned Outcome Contract: baseline, metric definition, guardrails and accountable owner. |
| 2. Spec and context | Write stories, acceptance criteria, interface changes and scope. | Verify traceability and provenance; explore missing or conflicting context; define reference and deliberately faulty fixtures independently. | Versioned spec, approved fixture baseline, explicit unknowns and affected-path list. |
| 3. Build and integrate | Implement on a short-lived branch and produce a preview. | Run unit, contract, integration and browser tests; verify that the reference passes and the faulty version fails for the expected reason. Use repeated, calibrated evals only for generative behaviour. | Revision-bound evidence; no missing mandatory check or hidden skipped test. |
| 4. Release | Prepare telemetry, exposure limits and rollback. | Reconcile evidence with the contract; dry-run rollback and check measurement. | A named owner records the Human Release Mandate before the first real-user exposure. |
| 5. Limited rollout | Release a bounded cohort under the mandate. | Compare health against control; hold or roll back on bad or missing signals. Do not equate canary health with causal business benefit. | Deployment decision, metrics and reason codes. |
| 6. Monitor and restart | Continue normal observation after rollout. | Emit a deduplicated event for a breach or a scheduled review. Convert it into the next goal/question, with the signal attached. | New independently identified cycle, linked to the observed event and prior mandate. |

## Pilot milestones

1. **Offline:** simulate duplicate conversion, missing evidence, expired mandate and an unhealthy rollout. Compare normal browser-style success with independent evidence. Confirm the seeded defect cannot pass the gate.
2. **Staging:** add deterministic fixtures, separate CI jobs and a revision-bound evidence file. Test the same business rule at API and UI boundaries; verify synthetic telemetry and the reversible kill switch.
3. **Bounded production trial, after explicit approval:** one reversible change and one named owner. Decide exposure, runtime window, minimum sample and guardrails before launch. Record a clear outcome: promote, retain control, roll back or collect more data.
4. **Replication:** ask a second team to run the example. Compare false greens caught, false blocks, evidence completeness and time to decision against its normal workflow. Revise the RFC from the counterexamples rather than claiming results in advance.

**Boundary:** automation restarts triage, evidence collection and planning. It does not confer production authority on newly generated code. A different artifact or a changed risk profile gets reviewed again unless a separately approved policy explicitly covers that case. High-risk changes are outside the pilot.
