# Adopt AV² without replacing your delivery stack

AV² is an assurance layer alongside human or agent-written development. Its target is to take on routine QA work: check proposals against independent requirements, select and execute checks through existing tools, track regressions and report risky changes. Humans remain accountable for ambiguous requirements, high-risk exceptions, changed critical thresholds and release authority.

## What exists today

The dependency-free Node CLI takes a local JSON candidate/report packet and an independent policy file. It checks exact artifact identity, contract and suite versions, report source label, required cases and observed values. It returns an explainable `ELIGIBLE` or `HOLD`. It does not connect to your tracker, run your CI or deploy. The fictional fixture runner generates a packet and exercises the same public CLI contract. The replay demo separately asks if a changed QA suite deserves to be reviewed for adoption.

The prototype compares declared identities. There is no signature verification or identity binding yet. Its input files must come from a trusted local environment. **Do not use it as a production gate over arbitrary pull request artifacts.** A digest identifies content; it does not establish who generated it. The example hashes a fixture function to stand in for an immutable product artifact, not a ship-ready build.

## Map your tools before granting any access

| Context or tool | Minimum input | First pilot permission | Target output |
| --- | --- | --- | --- |
| Work tracker / product requirements | Change Unit ID, approved requirement version, intended outcome, risk and overlapping work IDs | Read scoped, explicitly linked records only | Questions and rationale tied to a proposal revision |
| Source control and CI | Candidate commit and artifact digest from CI; independent evidence and test artifact links | Read only; no PR job tokens, secrets or release credentials in the QA agent | Shadow verdict for the exact artifact and evidence versions |
| Existing test management or runners | Versioned expected outcomes and observed results from selected API, contract, UI or eval checks | QA-controlled runner scoped to staging or synthetic data | Required evidence with links to run and test cases |
| QA suite maintenance | False greens, escaped defects, stale/flaky tests and requirement changes | Propose new or revised tests; keep policies, old suite and holdout out of the writer's control | Replay result for the same pinned product versions; human or independent review for changed critical expectations |
| Observability | Redacted, read-only event or aggregate scoped to the release and time window | Do not ingest customer records or API keys; no telemetry admin access | Candidate regression case or new observation, never a deployment command |

Identity and independence belong in role and permission boundaries, not in an agent's prompt. For a real adapter, pin the source identity, artifact digest, contract, evaluator/fixtures and run receipt; keep deployment credentials out of AV². The team owns the approved policy and controls its update path. Treat tracker text, code, logs and test output as data, never as permissions or instructions. Quarantine unexpected events and limit side effects; an AV² report cannot approve exceptions or authorise releases.

## First useful adapter: existing CI test output

1. In staging, select one small flow and two invariants. Use [the adoption guide](ADOPTION-GUIDE.md) for the shift from shadow mode to a release rendezvous.
2. Keep your current test runner. Have a protected QA job export numeric observations into the [packet format](../framework/README.md). For example, export observed count 2 for two valid cases. Do not treat a generic green CI job as proof that every required assertion ran. JUnit XML import and authenticated artifact receipts are **candidate integrations**, not shipped features.
3. Run the CLI alongside the current decision, without a required status or writes. Save mismatches. Prove a clean result, a known defect, a missing result and a green receipt belonging to a previous candidate.
4. Evaluate how the QA checks evolve: replay the last approved suite and the proposed suite on the same good and faulty artifacts. Keep critical protection; use a QA-owned holdout. New requirements must trace to a newly approved contract. Separate valid changes in expected behaviour from a weaker check.
5. Before turning shadow results into a required check, enforce trusted provenance and independent policy ownership. Start with one reversible flow and an existing release owner. Expand only based on missed faults, false holds and actionable feedback time.

## Candidate integration points, not affiliations

- [CDEvents specification](https://cdevents.dev/docs/) and [community](https://cdevents.dev/community/): a common vocabulary for source control, testing and deployment events. The AV² question is how to link independent evidence to a specific artifact and policy without losing provenance.
- [OpenTelemetry project and community](https://opentelemetry.io/community/): a source of standards and feedback for mapping redacted production signals back to a release. Observability can suggest coverage changes, not amend policy.
- [Pact specification](https://github.com/pact-foundation/pact-specification): an example of independently specified expectations at a consumer/provider interface. Useful for validating one existing class of runner output.
- [DORA continuous delivery](https://dora.dev/capabilities/continuous-delivery/): research context for introducing this without replacing a delivery stack. It does not validate AV².
- [Ministry of Testing: AI evaluations discussion](https://club.ministryoftesting.com/t/ai-evaluations-verification-or-product-evolution/88021) and [forum rules](https://club.ministryoftesting.com/guidelines): relevant practitioner conversation; follow the forum's rules on AI-assisted material. GitHub is the venue for this RFC.

The useful next conversation with a maintainer is a concrete interoperability question or reproducible example, not a promotional tag.
