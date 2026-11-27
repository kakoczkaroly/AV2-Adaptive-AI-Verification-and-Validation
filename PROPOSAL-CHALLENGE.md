# AV² · Independent proposal challenge

**The proposer does not get to admit its own proposal.** This applies whether the business proposer is a person or an agent. Independent QA challenges the proposal before any affected implementation work begins, then continues reassessment while delivery runs. The unit is the scope of a decision; this is not a meeting or a global phase gate.

| Question | Independent check | Evidence or disposition |
|---|---|---|
| Does it make business sense? | Validate the need, KPI and assumptions against the approved business objective, hard constraints and counterexamples. An apparent conversion lift may hurt fulfilment capacity or measure the wrong thing. | Record the counterexample and ask for a revised hypothesis or an owner decision when the goals legitimately trade off. |
| Does it collide with work already in flight? | Verify the shared data fields, interfaces, metrics and expected behaviours against **queued, in-progress and pending rollout** Change Units, not just the deployed state. Shared surface is a signal, not proof of conflict. | Compare proposed end states. If incompatible, link both IDs and block the new affected unit until merged, sequenced or redesigned. |
| Does it cross a requirement or policy boundary? | Map the proposal to applicable, versioned requirements and the owning decision. Use a deterministic rule for a known hard constraint. Treat unresolved GDPR or EU AI Act applicability as a policy-owner question, not a QA verdict of compliance. | Block a proven policy breach. On ambiguous applicability or missing authority, hold and escalate with the source and precise question. |

### Example: a perfectly implementable change that should not be built

**P-17:** forward all quote-form submissions, including raw email addresses, to a new analytics integration to measure conversion. The synthetic Outcome Contract measures unique valid submissions, not contacts sent to analytics. Pending **CU-42** removes contact identifiers from that event. The pilot's **DATA-07** rule forbids raw email on that stream. A passing UI test would establish none of these three constraints. QA records three separate findings and holds P-17. A revised proposal that uses a non-contact request identifier is reassessed; that example is not a legal finding about the identifier or consent.

### Mechanism

- Independently publish a signed or protected decision record: proposal/contract revision, work-in-flight snapshot, rule IDs and versions, decision, evidence, owner and reopening triggers.
- Dispositions: **ADMIT** (no blocking evidence gap); **BLOCK** (verified hard-policy breach or incompatibility); **REVISE** (proposal misses an established outcome); **REVIEW** (unresolved facts, rights or scope). Only ADMIT can start affected implementation. A policy or dependency change can invalidate that admission. No blanket override and no automatic legal sign-off.
- Subscribe assurance to every meaningful artifact revision. Run exact static checks on changed lines when the rule is line-local, then reason and test at the smallest meaningful module, contract or executable slice. Not all lines support behavioural validation individually. A failed unit does not freeze unrelated streams.
