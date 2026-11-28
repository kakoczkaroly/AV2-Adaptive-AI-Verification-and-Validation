# CDEvents experiment: a green run must match the release artifact

This second offline example tests the mapping suggested by [Chase Kubala in CDEvents #348](https://github.com/cdevents/spec/discussions/348?sort=latest#discussioncomment-19969188). It leaves the [original custom-extension experiment](CDEVENTS-EXPERIMENT.md) intact.

```sh
node examples/cdevents-relation-assurance.mjs
node --test tests/cdevents-relation.test.mjs
```

No dependencies, network calls or deployment credentials are needed. The candidate is build 18 in all four cases; both synthetic builds pass the same local check, but their sample package bytes have different SHA-256 digests.

| Evidence presented for build 18 | Result | Why |
| --- | --- | --- |
| Green run points to build 18 | ELIGIBLE | Exact digest, approved QA suite and mandatory check match. |
| Green run points to build 17 | HOLD | The digest belongs to the older package. |
| No artifact relation | HOLD | We do not know which package was tested. |
| Relation points to an event not in the input | HOLD | We cannot resolve the claimed package. |

The [relation](https://github.com/cdevents/spec/blob/v0.5.0/links.md#relation-link) points from the suite-finished event to the [packaged event](https://github.com/cdevents/spec/blob/v0.5.0/continuous-integration.md#artifact-packaged) by context ID, scoped here to an expected packager source. This demo uses `ARTIFACT` as its agreed link kind and a narrow digest-pinned OCI purl format. The suite ID and version come from [standard test-suite metadata](https://github.com/cdevents/spec/blob/v0.5.0/testing-events.md#testsuiterun-finished). The AV² contract and mandatory checks remain outside the events. The separate local QA record is matched to the finish event ID, run ID, source and digest; a suite-level `testOutput.published` mapping is deliberately out of scope.

These are synthetic inputs shaped to illustrate the mapping, not a full schema conformance test or a real producer capture. The source fields are checked as declared labels, not authenticated. ELIGIBLE means ready for review, never authorised to deploy.
