# Azure AI Search - workspace instructions

Reusable investigation and experimentation tooling for any Azure AI Search
project. Do not assume an industry, document schema, country, service or index.

- Use `azure-ai-search-engineer` and select `diagnose-indexer`, `analyze-query`,
  `benchmark-relevance` or `review-capacity` for the requested investigation.
  Follow [the shared method](azure-ai-search-method.md).
- Load `build-search-lab` only when an interactive lab helps answer the question.
  Load `azure-search-documents-py` when implementing Python SDK calls.
- **UAT and PROD are read-only.** Search, suggest, autocomplete, analyze and
  explicitly authorized GET operations only. Writes require an explicitly
  identified Sandbox, an approved plan and scoped cleanup. Unknown environments
  are read-only; an environment label alone does not enforce permissions.
- Secrets live only in `.env` and `test-search.config.js` (git-ignored). Never
  read, print, copy or inline them. Scripts load `.env` at runtime; labs load
  `test-search.config.js` and `lab-kit/lab-core.js`.
- Every number you report must come from a script result in `<case>/results/`
  or a lab export, with date, environment and api-version.
- Language: all project artifacts, including README files, team notes,
  documentation and lab UI, are in English. User conversations may follow the
  user's language.
- Layout: one folder per case (`<case>/` with `README.md`,
  `scripts/NN_*.py`, `results/`, `evidence/`); labs at the root as
  `<case>-lab.html` so they sit next to `test-search.config.js` and `lab-kit/`.
- Prefer Microsoft Learn (MCP `microsoft-docs`) to confirm Azure AI Search
  behavior, and cite the page in the README.
- Discover Azure MCP command schemas before calling them. Use REST/SDK when an
  MCP tool cannot preserve the exact request or does not expose the operation.
- `/save-search-case` saves or updates a case and `CASE-CATALOG.md`; `/retro`
  proposes reusable lessons. Neither automatically changes permissions or
  commits. Do not modify historical cases as part of tooling maintenance.
