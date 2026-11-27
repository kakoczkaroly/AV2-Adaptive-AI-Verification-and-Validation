# AV² local prototype

Run from the repository root using Node.js 22+; no dependencies or accounts. This is an evidence gate prototype, not a deployment service, AI agent or hosted integration.

```sh
node examples/quote-assurance.mjs
node --test tests/assurance.test.mjs tests/release-stream.cjs
```

The demo prints three evidence decisions and four QA-suite replay outcomes. Fresh evidence for the correct reference is `ELIGIBLE`. A cross-account counting defect and a green report from the wrong artifact both `HOLD`. The QA replay shows how a suite can catch the new defect yet lose protection against an older regression. Only the full fixture suite meets the sample replay criteria for review.

## Use the packet interface

Generate the two files with the bundled offline example, or produce them using your own trusted QA job:

```sh
node examples/quote-assurance.mjs --policy > av2-policy.json
node examples/quote-assurance.mjs --packet > av2-packet.json
node framework/cli.mjs av2-policy.json av2-packet.json
```

- Policy: `contract`, `suite`, `source`, and `expected` (required check IDs mapped to expected integers).
- Packet: `candidate` with `id` and 64-character lowercase hexadecimal `artifact` SHA-256; `report` with `candidate` (ID), `artifact`, `contract`, `suite`, `source`, and `results` (unique check IDs with observed integers). Generate results and artifact identity from the independently controlled run.
- Exit codes: 0 eligible, 2 hold, 1 invalid CLI usage, unreadable file or invalid JSON. A decision never grants deploy authority. The JSON receipt says why a candidate was held and includes check results when available.

A matching `source` string is not authentication. For this local prototype, run both jobs under a trusted workflow and never feed it attacker-controlled policy, packets or unpublished customer data. Review the [integration and permission boundary](../docs/INTEGRATIONS.md) before adapting it. This output is not a certification or measurement of efficacy in production.
