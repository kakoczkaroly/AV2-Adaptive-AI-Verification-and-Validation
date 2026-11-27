# Contributing feedback to AV²

Start at [the current RFC](https://github.com/kakoczkaroly/AV2-Adaptive-AI-Verification-and-Validation/issues/2). Useful contributions include:

1. A small case where existing assurance produced a false green or a false hold.
2. A redacted sample report from an existing tool, showing which fields are independently trustworthy.
3. A suggested regression case. Include the intended behaviour, one valid observation, and one trace the check should reject.

Prefer reproducible, synthetic fixtures. Do not include organisational identifiers, credentials, proprietary logs or customer data. Keep contributions in English. Feedback is welcome; a link to a project does not imply an affiliation or endorsement.

Run the [prototype and tests](framework/README.md) before proposing changes to the decision logic. If changing a test, show that it still passes a valid reference and catches the critical known faults.
