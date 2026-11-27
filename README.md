# AV²: Adaptive AI Verification & Validation

**v0.1 · Open RFC · Károly Kakocz**

AV² is a proposed quality model for AI-assisted software delivery. A green build is weak evidence when the same mistaken assumption shapes the requirement, code and test. AV² asks teams to preserve an independent source of expected behaviour and make release decisions on traceable evidence.

| Checkpoint | Verification | Validation |
| --- | --- | --- |
| Intent | Trace the baseline and benchmark to sources. | Check that the problem matters to the intended users. |
| Specification | Make the acceptance rules and boundaries testable. | Walk through representative user scenarios. |
| Context, when AI is involved | Version the relevant sources, prompts, model and skills. | Test behaviour with incomplete or conflicting inputs. |
| Build | Run conventional component, integration and system checks. | Check the user journey and whether tests catch a seeded failure. |
| Release | Tie evidence and rollback readiness to the exact revision. | Decide whether the evidence supports limited exposure. |
| Live | Verify telemetry and stop conditions. | Compare outcomes with a control where feasible. |

**Outcome Contract:** define the business objective, measurement and guardrails before implementation. **Evidence Gate:** keep the acceptance rule and tests that serve as independent evidence outside the implementation agent’s control. **Human Release Mandate:** for a bounded low-risk pilot, a named owner approves scope and limits before first user exposure. Changes to scope or risk require renewed review; missing required evidence blocks rollout.

Keep conventional tests. Add AI-specific evaluations where a generative component or decision actually needs them. Limited rollout is a safety check, not proof of business uplift. This is a working proposal, not a formal standard or a claim of production results.

[Join the first discussion: what evidence should block an AI-assisted release?](../../discussions/1)

Background: [ISTQB CTFL](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf) · [NIST Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) · [Google SRE: Canarying Releases](https://sre.google/workbook/canarying-releases/).
