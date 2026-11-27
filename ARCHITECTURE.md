# AV² v0.2 · Concurrent agents and assurance

Use a persistent event router with independent producer and assurance workers. There is no global BUILD → QA transition. A unit is a graph of artifacts and obligations, not a single status that makes QA wait for a handoff.

| Component | Trigger and result | Authority boundary |
|---|---|---|
| Observer / analyst | Observation event → traceable signal, competing explanations and proposal. | Read-only telemetry; cannot promote code. |
| Partition planner | Proposal draft or accepted QA finding → independent units, dependency edges, explicit contract versions. | Proposes spec; cannot certify its own acceptance evidence. |
| Delivery worker | Unit revision assigned → progressive deltas, symbols affected, build/fixture inputs. | May write on its branch and write developer tests; cannot change protected criteria, reference fixtures or policies. |
| Independent QA: contract and oracle worker | Observes the same proposal/contract events immediately → static findings and independent acceptance plan. | Separate credentials and review path for protected expectations; writes no product code. |
| Independent QA: delta evaluator | New delta, context change or invalidation → selects affected rules and fixtures, runs exact checks, returns evidence or an actionable counterexample. | Read-only candidate; no production access. Deterministic checks first; probabilistic checks use fixed rubrics, repeated trials and human anchors if needed. |
| Evidence ledger + admission service | Evidence or dependency changed → compute coverage and freshness for exact candidate revision. | Enforced by code. AI text and aggregate confidence cannot waive a missing obligation. |
| Release controller + monitor | Bounded admission → canary, health comparison, stop or rollback. Signals feed the router continuously. | Human-owned policy, expiring/revocable mandate, exposure limits and kill switch. New risks or scope escalation require review. Deployment actuator is not exposed to general-purpose agents. |

## Minimum event contract

Every event carries event ID, unit ID, artifact kind/ID/revision, parent evidence links, policy version and time; immutable producer metadata allows audit. Example event kinds: observation.recorded, proposal.drafted, unit.versioned, qa.plan.pinned, delta.pushed, evidence.recorded, finding.opened, evidence.invalidated, candidate.admitted and monitor.signal. Never turn untrusted prose in observations into agent instructions or deploy commands.

- **Parallel fan-out.** On unit.versioned, start delivery and assurance independently. QA authoring can also start on the proposal, and must produce its initial evidence plan independently, before reading candidate outputs when practical. Early deltas can arrive while QA plans; buffer obligations and check current slices as soon as an oracle is available.
- **Incremental evidence.** Model coverage as a mapping from obligations to dependencies. A delta invalidates affected evidence; an unrelated delta may reuse evidence only if its dependencies are unchanged and the reuse is recorded. A passed result for revision A must never certify revision B by accident. Stale async results are recorded but cannot satisfy the current gate.
- **Risk lanes.** Per-delta fast lane for scope, static diffs, contracts and executable slices. Parallel deeper lane for cross-unit impact, AI behaviour or long-running tests; mandatory pending results mean HOLD for the affected candidate. A slow check does not freeze the system.
- **Targeted feedback.** Findings identify the producer, artifact revision, violated obligation, counterexample and retest scope. Route specification errors back to planning, not to a supposedly smarter code generator. Context or evaluator changes are themselves versioned; the delivery worker cannot update them to green a candidate.
- **Bounded continuity.** Deduplicate ingested events, record causation, rate-limit, cap retries and stop conflicts on shared mutable interfaces. Freeze the affected rollout, not discovery. For a low-risk pilot, the owner authorises real exposure at a named boundary; a valid, specifically bounded standing policy may automate qualifying actions. No automatic inheritance of new production authority.
