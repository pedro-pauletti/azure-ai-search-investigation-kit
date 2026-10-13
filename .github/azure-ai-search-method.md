# Investigation method - Azure AI Search

One agent leads the case; specialized skills define the procedures.
This methodology does not assume a project, industry, schema or environment.
Write project artifacts in English; user conversations may follow the user's
language.

## Context and approval

Before measuring, record: the question, expected versus observed behavior,
environment, service/index/indexer, date, api-version, authorized identity
(without secrets), exact request or error, and data/cost/load constraints.
Do not invent values. Treat unidentified environments as read-only.

Consult [the catalog](../CASE-CATALOG.md) and reconfirm all environment-dependent
facts. An old case teaches a method, not the current state.

Present a `hypothesis | test | falsification criterion` table, including the
original suspicion and an alternative. Define workflow-appropriate acceptance
and regression criteria, request/concurrency/duration limits and stop conditions.
Wait for approval before remote traffic. Query authorization does not authorize
load testing, changes or data exposure.

## Reproduce, measure and explain

- Reproduce the captured request without changing parameters. Preserve metadata
  and label the source: `captured`, `proposal`, `assumption` or `measured`.
- Without a request, create a diagnostic baseline explicitly labeled as an
  assumption. If the symptom cannot be reproduced, document the gap before
  testing another question.
- Change one variable at a time. Tool, SDK and REST results are comparable only
  when they send equivalent requests to the same dataset.
- Consult Microsoft Learn to confirm behavior and support for the version.
  Generic recommendations do not prove improvement in this project.
- Retain refuted hypotheses and inconclusive results. Do not confuse
  correlation, field attribution and causality.
- Validate only relevant checks: token evidence for lexical issues; judgments
  for relevance; telemetry for capacity; execution history for indexers.
  Do not require every case to produce a lab.

## Evidence and safety

Layout: `<case>/README.md`, `scripts/NN_*.py` (or equivalent tooling),
`results/NN_*.json`, `evidence/`. Labs live at the root as `<case>-lab.html`.

Each result must contain `meta.date` (ISO with timezone), `meta.environment`,
`meta.service`, `meta.index` or `meta.indexer`, `meta.apiVersion`, the request
source, sanitized parameters and the command/script that produced the result.
Telemetry must record the UTC window, aggregation, unit and source.
Locally calculated metrics must identify their input files.

Scripts load configuration at runtime. The agent must not read secret files;
do not print authentication headers, tokens, connection strings or private
content in results, screenshots, Learn prompts or logs.
Capture only authorized and necessary fields; sanitize data source/skillset
exports because they may contain credentials.

UAT/PROD: authorized reads only, including search/suggest/autocomplete,
Analyze and specific GET operations. Do not run/reset indexers, test uploads,
change networks/roles/skillsets or scale the service. Sandbox: approve the exact
resources and writes, use unique names, and clean up only resources created
for the case.
Prefer least-privilege identities and credentials; browser admin keys are
visible in DevTools and do not enforce read-only access.

## Review and preserve

Check provenance, numerical sources, acceptance criteria, regressions, failures
and limitations before reaching a verdict. Use [the template](case-template.md)
and [/save-search-case](prompts/save-search-case.prompt.md) to save the case.
Update the catalog without duplicating or deleting entries.
[/retro](prompts/retro.prompt.md) proposes small, deduplicated improvements;
apply them only with approval, without automatic commits.
