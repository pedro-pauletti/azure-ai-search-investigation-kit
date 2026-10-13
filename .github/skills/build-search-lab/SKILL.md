---
name: build-search-lab
description: "Use when building a read-only interactive Azure AI Search lab, Today vs Proposal comparison, or visualization of saved indexer/capacity evidence. Reuse lab-kit and validate with a stubbed smoke test; never run writes or load tests."
---

# Build Search Lab

An optional presentation and reproduction skill, not a prerequisite for every
investigation. Follow [the shared method](../../azure-ai-search-method.md).

## Procedure

1. Require a case question, measured evidence or an explicitly assumption-labeled
   diagnostic baseline, approved target, exact A/B requests and applicable limits.
   Do not present an unreproduced symptom as a confirmed production problem.
2. Choose the surface:
   - query/benchmark: live read-only comparison with regression terms;
   - indexer/capacity: sanitized saved evidence visualization; no execution,
     reset, credential-bearing definitions, load or scaling controls.
3. Use [lab patterns](references/lab-patterns.md). Synchronize
   `assets/lab-kit/` into root `lab-kit/` only after checking local differences.
   Preserve case-specific changes; do not blindly overwrite them.
4. Start from [the template](assets/lab-template.html) for live comparisons.
   Save `<case>-lab.html` at the root beside runtime config and `lab-kit/`.
   Fill `CASE`, replace TODO markers, set `keyField` and `displayFields` from the target schema,
   and distinguish captured values from proposal/lab choices.
   Template A starts as `assumption`; change to `prod` only with a captured source.
5. Load `test-search.config.js` and `lab-kit/lab-core.js`; never inspect/copy the
   secret config through agent tools. For setup, use
   [the empty config example](assets/test-search.config.example.js).
   Every live call goes through `LabCore.*`, with the unchanged read-only allowlist.
6. Show requests/provenance, metadata, explicit errors/limitations and evidence
   export. Disable unsupported features visibly; do not fake empty successes.
   Saved-evidence-only pages must label their source and make no service calls.
7. Validate live labs:
   `node .github/skills/build-search-lab/scripts/validate-lab.cjs <case>-lab.html --shot <case>/evidence/lab.png`.
   Require no errors and a completed stub smoke test; skipped smoke is not full
   validation. Resolve warnings or explain them. The stub proves UI/safety, not
   actual Azure behavior. For evidence-only pages, use browser checks with all
   remote traffic blocked rather than pretending the live-lab validator applies.
8. Open the lab. A real run requires the approved target and traffic budget.
   Save its sanitized export in `<case>/results/`; keep stub screenshots clearly
   distinguished from real evidence. The same engineer checks the final lab.

## Checklist

- Explicit baseline origin and proposal differences.
- Correct schema fields and API version; no hardcoded project/index assumptions.
- No secrets, write controls, direct fetch or uncontrolled load.
- Evidence export and limitations; no comparison of unrelated scores.
- Stub/browser validation recorded separately from actual service evidence.
