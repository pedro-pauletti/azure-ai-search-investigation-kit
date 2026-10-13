---
name: save-search-case
description: "Document and preserve an Azure AI Search investigation, its evidence and reproduction steps, and update the reusable case catalog. Supports complete, inconclusive and blocked cases without committing."
argument-hint: "Case folder and optional lab path."
agent: azure-ai-search-engineer
---

# Save an Azure AI Search case

Input: the case folder supplied in the command and, optionally, a lab and
conversation context. Follow [the method](../azure-ai-search-method.md) and
[the template](../case-template.md). This command saves work; it does not
start queries, fix resources, change skills or commit.

1. Identify the case. If the folder is ambiguous, ask before writing.
   Read existing documentation and relevant evidence; integrate without
   deleting previous work or rewriting unselected historical cases.
2. Check the problem, workflow, context, approved plan, sanitized request,
   scripts, results and lab, if any. Do not access secret files.
3. Validate the source of every number: file, date, environment, api-version
   and parameters. Distinguish stubs, real measurements and estimates.
   Do not invent values to fill tables; record gaps and inconclusive/blocked
   status.
4. Create/update `<case>/README.md`: verdict, hypotheses including refuted ones,
   demonstrated mechanism, acceptance criteria, results, rejected alternatives,
   recommendation, limitations, reproduction commands and Learn references.
   Use English; keep confidential data/documents out of the report.
5. Update [CASE-CATALOG.md](../../CASE-CATALOG.md) with a relative README link,
   workflow, symptom/tags, environment, evidence date and status.
   Update the existing entry by case path without duplicating or deleting
   other entries. Do not record private payloads or secrets in the catalog.
6. Check local links and list what was saved and what is still missing.
   If there is a reusable lesson, offer `/retro` separately. Do not apply
   that lesson or create a commit without explicit approval.
