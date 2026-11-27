# AV² v0.3 · Implementation plan

## Unit of change

A **Change Unit** is the smallest independently checkable, traceable change; it should be separately reversible where practical. Its versioned contract gives agents the objective and provenance, in/out-of-scope components, machine-readable invariants, examples, dependencies, acceptance/evidence requirements and rollout constraints. If two changes cannot preserve the invariant independently, bundle them or use a compatibility contract. Human-readable stories may be generated as views; they are not the execution interface. See the [example](examples/change-unit.json). IDs and hashes in that file are illustrative.

## Proposal challenge before affected implementation

The human or AI acting for the business proposes; independent QA checks the proposal against the Outcome Contract, the live portfolio of planned changes, and applicable versioned requirements. Verified conflicts or breaches block the affected work; uncertainty is escalated. Narrow or resequence the proposal and repeat the check. Discovery and unrelated work remain concurrent. [Decision rules and example](PROPOSAL-CHALLENGE.md).

## Artifact-level checks

| Artifact or event | Verification | Validation | What happens on failure |
|---|---|---|---|
| Observation | Check event identity, source, time window, cohort and deduplication. | Check that the signal reflects an actual problem, not tracking drift or a misleading comparison. | Reject signal or request more data; no change proposed as fact. |
| Proposal | Check provenance, assumptions, constraints and alternatives. | Test the proposed mechanism on counterexamples and representative scenarios; record what would disprove it. | Return to the hypothesis with a concrete counterexample. |
| Unit contract | Statically check schema, links, dependency graph, scope, testability and conflicting rules. | Check that exact examples capture user need, including negative cases. | Revise the contract; affected downstream evidence becomes stale. |
| QA plan and fixture | Trace each critical invariant to independent expectations. Check corpus version, determinism and ownership. | Known-good slice passes and deliberately faulty fixture fails for the intended reason; a weak assertion must not pass review. | Fix the test or escalate the oracle; never relabel missing evidence as not applicable. |
| Working delta | Scope-aware line/diff checks for precise static rules; symbol/module checks for semantics and interfaces. Run focused contract/property checks when the slice is executable. | Validate the relevant scenario against the smallest meaningful executable slice. Whole-journey claims wait until integration; unknown is not a pass. | Report against the exact revision and replay impacted checks on next delta. |
| Integrated candidate | Reconcile hashes for artifact, contract, checker and fixtures; test cross-unit interactions. | Check system journeys, nonfunctional thresholds and likely user impact, at the appropriate granularity. | Hold only affected units or dependency closures; unrelated work proceeds. |
| Limited exposure and production | Verify mandate, health, telemetry and event integrity. | Compare the right outcome to a control where feasible; differentiate safety from effectiveness. | Roll back on guardrail breach; send signal to discovery, not directly to deploy. |

## Pilot timeline: one minute-scale feedback example

**Fictional quote form.** A telemetry discrepancy suggests retries are counted as new conversions. QA checks event provenance while the analyst writes a proposal. QA then pins its own acceptance rule: a valid submission followed by the same request ID counts once; two distinct valid IDs count twice. A separate unit for dashboard copy can proceed, but a dashboard metric change depends on the invariant if it reads this event stream.

- QA authors the fixtures before the delivery agent emits the first delta. The first delta still double-counts; the independent contract check fails while the builder is working, before any full UI flow is available.
- A corrected delta passes static and focused dynamic checks. A test that checks only for a success toast still fails the seeded-fault challenge. A cross-component check later validates the reporting path.
- A small bounded exposure may proceed after policy and approval checks. Meanwhile, monitor signals can open or reprioritise another unit. Batching and backpressure keep noise from triggering unbounded work.

## Regression is a continuous obligation

For a changed candidate, distinguish **confirmation testing** (did the reported defect disappear?) from **regression testing** (did pre-existing, unrelated correct behaviour survive the change?). For each relevant delta, rerun the defect reproducer and a dependency-selected regression set in the fast lane. Widen the set on shared interface or context changes; keep broader integration or end-to-end checks running independently. Do not release an affected candidate if required regression evidence is missing, stale or red. Record cases selected and skipped, reasons, artifact SHA and test-set version. Where the impact cannot be bounded, widen coverage or hold.

Example: R1 counts A,A as 2 (fail). R2 returns 1 for all non-empty requests: it passes the duplicate retest, but A,B incorrectly returns 1 (regression). R3 counts unique valid request IDs: A,A → 1 and A,B → 2. The demo executes both checks independently on each revision.

## Prove that this adds value

1. Run offline scenarios for malformed contract, wrong invariant, weakened tests, stale evidence, conflicting units and rollback. Compare to a baseline that runs CI only after integration.
2. In staging, instrument detection latency (delta to useful finding), false blocks, missed seeded defects, independent critical evidence coverage and checks per delta. Verify dependency invalidation and reproducible rerun.
3. Compare observed latency and failure detection before choosing a cadence. Small static or focused checks can run on each meaningful delta; UI/system or qualitative checks can run asynchronously. High speed is a target and has not yet been measured.
4. Start any production pilot only under explicit bounded release authority, with control and stop conditions. Use genuine user outcomes and record uncertainty; no automatic rewriting of the approval or QA policy.
