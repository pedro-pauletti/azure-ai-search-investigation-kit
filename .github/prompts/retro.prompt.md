---
name: retro
description: "Propose small, evidence-backed improvements to Azure AI Search workflows, lab templates or checks from a saved case. Wait for approval before editing; never commit automatically."
argument-hint: "Saved case folder and optional lab."
agent: azure-ai-search-engineer
---

# Retro - improve the method from a case

Input: a case folder and an optional lab. Consult
[the shared method](../azure-ai-search-method.md).
If the case has not been preserved yet, use `/save-search-case` first.

1. Read the README, relevant evidence, script list and validation result.
   Extract surprises, refuted hypotheses, rework, missing checks and potentially
   reusable assets. Include numbers only when their source is available.
2. Deduplicate against the method, workflow skill and existing references.
   Project-specific context stays in the case; it does not become a global default.
3. Assign each lesson to a destination:
   | Lesson | Destination |
   | --- | --- |
   | Cross-cutting method/safety | Instructions or shared method |
   | Workflow procedure | Corresponding skill or reference |
   | Lab asset | Template, lab-kit or validator in build-search-lab |
   | Environment/project fact | Case README, with date and source |
   | Microsoft skill issue | Separate proposal preserving upstream provenance |
4. Present `lesson | evidence | destination | exact change` and the diffs.
   Wait for approval. Do not edit automatically or expand permissions.
5. After approval, apply only accepted diffs and validate the changed surface.
   If lab-kit changes, synchronize the runtime copy without overwriting local
   changes, run the smoke test and record the result.
6. Refresh the HTML with `npm run update-guide` from the project root when
   displayed files change. Report the result; commit only if explicitly requested.
