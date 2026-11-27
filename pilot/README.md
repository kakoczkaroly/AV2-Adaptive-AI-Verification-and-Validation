# AV² double-helix staging pilot

This is a bounded end-to-end implementation of two turns of the double helix. The input is a fictional quote-counting service. The QA and delivery roles make real local model calls and run alongside one another. The service really serves an immutable candidate configuration over HTTP. Nothing is deployed outside this loopback server.

## Run it

Requirements: Node.js 22+ and a local OpenAI-compatible model server that supports JSON-schema responses. Bind the model server to loopback only. The tested setup uses [llama.cpp](https://github.com/ggml-org/llama.cpp) and [Qwen 2.5 1.5B Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), Q4_K_M. No API key or hosted account is necessary. Download the model and server from their maintainers.

In one terminal, substituting the actual path to the model:

```sh
llama-server -m path/to/qwen2.5-1.5b-instruct-q4_k_m.gguf --host 127.0.0.1 --port 18426 -c 2048 -np 2 --alias av2-qwen
```

From the repository root in another terminal:

```sh
AV2_MODEL_ORIGIN=http://127.0.0.1:18426 AV2_QA_MODEL=av2-qwen node pilot/run.mjs --stage
```

PowerShell:

```powershell
$env:AV2_MODEL_ORIGIN = 'http://127.0.0.1:18426'
$env:AV2_QA_MODEL = 'av2-qwen'
node pilot/run.mjs --stage
```

Optionally set `AV2_DELIVERY_MODEL` and `AV2_DELIVERY_ORIGIN` to use a separately hosted local model for delivery. By default both roles use different requests and contexts on the same local model. This is role isolation inside a teaching pilot, not separate machine identities or cryptographically authenticated provenance. Do not expose these local listeners or give them production credentials.

The CLI emits JSON Lines. Exit code 0 means two staging releases completed; 2 means the pilot stopped short; 1 means a configuration or runtime error. `--stage` authorises this run's disposable local target only. There is no production adapter, remote deployment action, long-running scheduler, or shell execution of model output. The bounded delivery role selects an allowed configuration, not arbitrary source-code changes. The QA role proposes a probe from a predefined catalogue, not arbitrary test code. Both roles can fail; the gate will not treat a model's answer as proof.

## The two turns

1. **CU-01: stop duplicate counting.** The independent QA model proposes a case to distinguish per-account and global IDs. Its proposed suite must pass the reference, preserve previous checks and catch the seeded defect. The first candidate is deliberately flawed. The AV² evaluator holds it, and delivery receives the failing check and selects a correction. After the release gate and an actual HTTP smoke check, the first increment serves requests.
2. **CU-02: count only valid requests.** A staging HTTP probe observes an invalid request incorrectly counted. That observation opens the next turn automatically. Delivery and QA work on the same released baseline while that baseline is still being checked. A qualified QA check detects the invalid case; it is added to the previous checks. The second increment is promoted and the same probe confirms the correction.

The original evidence evaluator binds the candidate ID, SHA-256 of its configuration bytes, contract version and suite version to a receipt. The evaluator never grants deploy authority. The staging wrapper checks the independently supplied local mandate and that the baseline has not changed, then activates the candidate, checks it over HTTP, and restores the previous configuration on a failed canary. The fixed service code is outside the configuration digest; a real integration must bind the entire deployable artifact (for example an image digest) and independently authenticate its test evidence.

## Evidence and limits

```sh
node --test tests/helix-pilot.test.mjs
```

The automated tests use model substitutes to verify the control path, bad QA proposals, model outages, evidence from the wrong artifact, absent authorisation and rollback. They are not an inference benchmark. Real-model traces are separate. A small model can choose an ineffective test and correctly produce a hold rather than a green. Findings from this two-turn fixture do not establish effectiveness on a real application.

Before using a shared target, replace the local controller with a protected CI/CD identity, authenticated build and test receipts, explicit independent QA-suite approval, and a scoped release authority. Prove hold, canary and rollback in a real staging environment before considering production. Production is not enabled in this branch.

See the [verified run transcript](verified-run.jsonl): actual inference with llama.cpp b12818 and Qwen 2.5 1.5B Q4_K_M, followed by two HTTP-verified local promotions. The first rejected candidate did not go live; the monitoring probe showed 1 then 0 invalid requests counted. The approved check count grew from two to three to four. Earlier model/prompt trials produced holds on weak QA or ineffective repair; the trace shows one successful run, not a claim about model reliability.
