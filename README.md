# Azure AI Search Investigation Toolkit

A reusable GitHub Copilot workflow for investigating Azure AI Search: one
specialized agent, focused skills, reproducible evidence and optional read-only
labs. It does not assume a customer, document schema, industry or environment.

Use it to move from **"this search looks wrong"** to an explanation supported by
captured requests, controlled tests, official documentation and explicit limits.
When evidence is missing, an inconclusive answer is better than an invented fix.

> **Prefer an interactive explanation?**
> Open [the live presentation on GitHub Pages](https://pedro-pauletti.github.io/azure-ai-search-investigation-kit/)
> or [the local presentation guide](search-lab-explained.html) in your browser.
> Explore the agent's capabilities, select a scenario, walk through a simulated
> Copilot conversation and copy a starter prompt. The guide runs offline and
> needs no Azure account, credentials, Node.js or MCP configuration.
> On GitHub, download or clone the repository and open the local HTML file;
> the GitHub file viewer does not run the interactive page.

## Contents

- [What this project does](#what-this-project-does)
- [How the pieces work together](#how-the-pieces-work-together)
- [Quick start](#quick-start)
- [Choose a skill](#choose-a-skill)
- [Run an investigation](#run-an-investigation)
- [Example prompts](#example-prompts)
- [Use the interactive presentation](#use-the-interactive-presentation)
- [Optional labs and relevance scoring](#optional-labs-and-relevance-scoring)
- [Project layout](#project-layout)
- [Safety and credentials](#safety-and-credentials)
- [Local checks and maintenance](#local-checks-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Reuse in another workspace](#reuse-in-another-workspace)

## What this project does

| Question | Workflow |
| --- | --- |
| Why did an indexer fail or skip documents? | Indexer diagnosis |
| Why does a query match, omit or rank a document unexpectedly? | Query analysis |
| Does a proposed configuration improve a judged query set? | Relevance benchmarking |
| What does the telemetry show about latency, throttling or capacity? | Capacity review |

This is **not** a hosted application, a deployment tool or an autonomous
production repair system. Selecting an agent does not install an SDK, configure
MCP servers, authenticate to Azure or grant permissions.

The presentation illustrates the workflow; it does not execute it. Real
investigations happen in VS Code through approved tool calls and local scripts.

## How the pieces work together

```text
Your question and captured evidence
  -> Azure AI Search Engineer agent
  -> Selected investigation skill + shared method
  -> Hypotheses, acceptance criteria and approval
  -> Approved tools / exact REST or SDK requests
  -> Reproduction, measurements and evidence review
  -> Verdict + optional lab
  -> Saved case + optional retrospective
```

- **Workspace instructions** set shared rules for evidence, language and safety.
  See [copilot-instructions.md](.github/copilot-instructions.md).
- **The agent** coordinates the investigation, selects a skill and keeps the
  case focused. See [its definition](.github/agents/azure-ai-search-engineer.agent.md).
- **Skills** provide task-specific procedures and, where needed, scripts,
  references and templates. They are not separate agents or permission grants.
- **The shared method** requires reproduction, competing hypotheses, controlled
  tests and traceable results. See [the method](.github/azure-ai-search-method.md).
- **Tools** supply evidence: Azure MCP for supported reads, Microsoft Learn for
  documented behavior, and REST/SDK scripts when the exact request matters.
- **Prompts** preserve a completed or inconclusive case and propose improvements
  separately. Saving does not automatically commit or change the methodology.

Only load the skills the case needs. An indexer diagnosis does not automatically
require a relevance benchmark or a browser lab.

## Quick start

### Explore without Azure access

1. Download or clone this repository.
2. Open [search-lab-explained.html](search-lab-explained.html) in Edge, Chrome or
   another modern browser. On Windows, from the repository root:

   ```powershell
   Start-Process .\search-lab-explained.html
   ```

3. Explore **Agent capabilities**, then **Case walkthrough**.
4. Copy a starter prompt when you are ready to try the workflow in VS Code.

### Use the agent in VS Code

1. Open the repository folder in VS Code with GitHub Copilot available.
2. In Copilot Chat, select **azure-ai-search-engineer** in the agent picker.
3. Confirm the agent and skills appear in **Agent Customizations**.
4. Start with a no-call triage prompt:

   ```text
   Use the analyze-query skill.
   A query returns an unexpected document, but I do not yet have the exact request.
   Validate your workflow selection and identify the missing evidence.
   Do not read secret files, call Azure or write files. Stop at a proposed plan.
   ```

5. For a real investigation, configure trusted MCP servers and an authorized
   Azure identity. Check the actual tool names in **Configure Tools** before
   approving any remote calls.

You do not need Node.js or Python for a planning-only conversation. Node.js is
needed for the repository's checks and local relevance scorer. Python and the
Azure SDK are needed only when the approved case uses Python scripts.

### Configure tools for real evidence

The [agent definition](.github/agents/azure-ai-search-engineer.agent.md) declares:

| Tool group | Purpose |
| --- | --- |
| `azure/search` | Supported Search resource reads and queries |
| `azure/monitor`, `azure/kusto`, `azure/resourcehealth` | Authorized telemetry and health evidence |
| `microsoft-docs/*` | Microsoft Learn search, page retrieval and code samples |
| Local read, search, edit and execute tools | Inspect authorized context and produce scripts and case artifacts |

Server and tool identifiers can differ between installations. Match the
agent's `tools` field to the identifiers actually exposed by your editor; do
not enable every Azure operation to work around a missing tool.

First verify tool discovery and Learn access without contacting your resources.
Resource queries require a separate approved plan and appropriate permissions.
If an MCP wrapper cannot preserve the captured request, use exact REST/SDK
calls instead. See [the setup guide](.github/README.md) for details.

## Choose a skill

| Skill | Use it when | Expected deliverable |
| --- | --- | --- |
| [diagnose-indexer](.github/skills/diagnose-indexer/SKILL.md) | Execution errors, connectivity, authentication, mappings or enrichment failures | Failing stage, evidence, alternatives and repair validation status |
| [analyze-query](.github/skills/analyze-query/SKILL.md) | Unexpected matches, missing documents, filters, analyzers, ranking or hybrid/vector behavior | Reproduced symptom, isolated mechanism, regression checks and limitations |
| [benchmark-relevance](.github/skills/benchmark-relevance/SKILL.md) | Comparing configurations against golden queries with explicit document judgments | Per-query metrics, coverage, regressions and an acceptance verdict |
| [review-capacity](.github/skills/review-capacity/SKILL.md) | Latency, throttling, volume, replicas, partitions or indexing/query contention | Dated telemetry, bottleneck assessment, tradeoffs and unvalidated scenarios |
| [build-search-lab](.github/skills/build-search-lab/SKILL.md) | An interactive comparison or saved-evidence visualization helps explain the case | Optional read-only lab with provenance, exports and UI validation |
| [azure-search-documents-py](.github/skills/azure-search-documents-py/SKILL.md) | Implementing Azure AI Search Python SDK calls | SDK patterns supporting the selected workflow |

You can request a skill explicitly, or describe the symptom and let the agent
select it. The Python skill supplies implementation guidance; it does not
replace the investigation method or authorize its bundled setup scripts.

## Run an investigation

### 1. Supply context, not a presumed solution

Provide the question, expected versus observed behavior, environment,
service/index/indexer, API version and exact sanitized request or error.
Include relevant document IDs, timestamps and constraints when available.

Do not paste keys, tokens, connection strings or private document payloads.
If context is missing, the agent should state the gaps rather than invent it.
It consults [the case catalog](CASE-CATALOG.md) for reusable methods, not as
proof that a historical conclusion still applies to the current environment.

### 2. Review and approve a bounded plan

Expect competing hypotheses, a test for each, refutation criteria, acceptance
and regression checks, and limits on requests, concurrency and duration.
Approval must identify the actual target and permitted operations.

Approving a query does not approve load testing, configuration changes or
writes. The presentation's **Approve demo plan** button grants no real access.

### 3. Reproduce before changing variables

The agent should reproduce the captured request unchanged, save the output and
then vary one relevant dimension at a time. If reproduction fails, that is a
result to preserve, not a reason to claim the proposed fix worked.

When no captured request exists, a diagnostic baseline must be labeled as an
assumption. Microsoft Learn confirms documented behavior but does not prove
what happened in your service.

### 4. Review evidence and the verdict

Expect traceable results with date, environment and API version, along with
the exact request or script that produced them. The verdict should distinguish
confirmed mechanisms, correlations, untested proposals and remaining gaps.

For relevance, a better-looking ranking is not enough: explicit document
judgments and comparable measurements are required. For capacity, use
authorized telemetry rather than generic sizing recommendations.

### 5. Visualize only when useful

Ask for `build-search-lab` if interaction would help. Query labs can compare
read-only requests; indexer and capacity labs can explain sanitized saved
evidence. A lab is optional, not an acceptance requirement for every case.

### 6. Save the case and keep improvements separate

Use [/save-search-case](.github/prompts/save-search-case.prompt.md) to preserve
the verdict, scripts, evidence and reproduction instructions, and update the
catalog. Inconclusive and blocked cases should also be recorded.

Use [/retro](.github/prompts/retro.prompt.md) to propose reusable lessons.
Review the proposed changes before applying them; neither command commits
automatically. The [case template](.github/case-template.md) defines the report.

## Example prompts

Replace placeholders with sanitized project context. These are starting points,
not approval to access a resource.

**Indexer diagnosis**

```text
Use diagnose-indexer.
Environment: <environment>. Target: <service/indexer>. API version: <version>.
Expected: <expected indexing behavior>.
Observed: <sanitized execution error and affected time range>.
Identify missing evidence and competing hypotheses.
Propose a bounded read-only plan and wait for approval. Do not run or reset the indexer.
```

**Query analysis**

```text
Use analyze-query.
Environment and target: <service/index>. API version: <version>.
Captured request: <exact sanitized JSON request>.
Expected versus observed: <document IDs, matches or ranking difference>.
Reproduce unchanged only after approval; then isolate one variable per test.
Include regression checks and distinguish assumptions from measured results.
```

**Relevance comparison**

```text
Use benchmark-relevance.
Golden queries and explicit judgments: <authorized local file>.
Baseline and proposal: <configurations>. Data snapshot: <snapshot>.
API version and cutoff K: <values>. Acceptance criteria: <criteria>.
Check judgment coverage and comparability before proposing any calls.
Wait for approval; report per-query regressions, not only averages.
```

**Capacity review**

```text
Use review-capacity.
Environment and service: <target>. Analysis window: <UTC start/end>.
Observed symptoms and latency goals: <details>.
Available sanitized telemetry: <files or authorized sources>.
Propose a bounded telemetry-read plan. Do not run load tests or scale the service.
Distinguish measured bottlenecks from correlation and untested recommendations.
```

## Use the interactive presentation

The [HTML guide](search-lab-explained.html) provides two complementary views:

- **Agent capabilities:** click Azure resources, Microsoft Learn, skills or
  workspace to see their roles, declared tools and access boundaries.
- **Case walkthrough:** choose an indexer, query, relevance or capacity
  scenario and follow context, approval, measurement, optional lab and saving.

The larger simulated chat includes expandable tool activity, a light/dark theme,
synthetic lab previews and a copyable starter prompt. The lab preview mirrors the
generated template's blue header, service/index/API context, request sidebar,
comparison board and analysis tabs. Indexer and capacity previews show saved
evidence instead of live query controls. All preview controls are disabled.
The walkthrough may scroll vertically to keep the chat readable. Its composer does not send
messages. No button invokes Copilot, contacts Azure, scores data or saves a case.

The guide embeds discovery metadata from the agent, skills and prompts.
Its scenarios are defined inside the HTML; they do not depend on external
evaluation fixtures. Links open the source definitions for further detail.
After changing discovery metadata, refresh it with `npm run update-guide`.
Keep [presentation-assets/](presentation-assets) beside the HTML when copying
the guide: its official Azure AI Search and GitHub marks, Microsoft logo and
chat/preview stylesheet load locally, without a CDN. Decorative icons are embedded in the page. Branding identifies
the referenced technologies, not Microsoft affiliation or endorsement.

## Optional labs and relevance scoring

### Build a real read-only lab

The lab skill uses the [template](.github/skills/build-search-lab/assets/lab-template.html)
and [lab-kit runtime](lab-kit). Save a live lab at the repository root as
`<case>-lab.html`, beside its local runtime configuration.

Set the document key and display fields from the actual schema. Preserve
captured requests and clearly label proposal choices and diagnostic assumptions.
Validate the lab with a stubbed service before an approved real run:

```powershell
node .\.github\skills\build-search-lab\scripts\validate-lab.cjs .\<case>-lab.html --shot .\<case>\evidence\lab.png
```

Replace placeholders and ensure the screenshot directory exists. The validator
checks the lab's UI and read-only rules using fake responses; it does not
validate search behavior against Azure. Saved-evidence-only pages use offline
browser checks instead of the live-lab validator.

### Calculate relevance metrics locally

The relevance skill retains its [offline scorer](.github/skills/benchmark-relevance/scripts/score-relevance.cjs):

```powershell
npm run score:relevance -- .\<case>\results\judged-rankings.json .\<case>\results\metrics.json
```

Supply your own approved, sanitized input according to
[the input and metrics contract](.github/skills/benchmark-relevance/references/metrics.md).
It contains metadata, cutoff K, queries, explicit judgments and baseline/proposal
rankings. The scorer calculates NDCG, MRR, precision and judged-pool recall,
reports coverage and refuses unjudged retrieved documents within K.

This command makes no Azure calls and never overwrites an existing output.
It evaluates query results, not the quality of the agent itself.

## Project layout

| Location | Purpose |
| --- | --- |
| [.github/agents/](.github/agents) | The investigation agent definition |
| [.github/skills/](.github/skills) | Procedures, references, templates and supporting scripts |
| [.github/prompts/](.github/prompts) | Save-case and retrospective commands |
| [.github/README.md](.github/README.md) | Tool setup, reuse and implementation details |
| [search-lab-explained.html](search-lab-explained.html) | Offline interactive presentation |
| [presentation-assets/](presentation-assets) | Official brand images and local chat/preview styling for the offline guide |
| [update-explainer.cjs](update-explainer.cjs) | Refreshes metadata embedded in the presentation |
| [lab-kit/](lab-kit) | Browser lab runtime, UI tests and Node.js tooling |
| [CASE-CATALOG.md](CASE-CATALOG.md) | Index of saved cases; initially empty |
| [test-search.config.example.js](test-search.config.example.js) | Placeholder-only browser configuration |

A saved investigation uses this layout:

```text
<case>\
  README.md
  scripts\NN_*.py        (or equivalent tooling)
  results\NN_*.json
  evidence\
<case>-lab.html          (optional, at the repository root)
```

Real cases are not included. Private local cases can live under the ignored
`local-cases` folder; place any live lab at the root and exclude it from
version control if it contains private case details. Do not assume an arbitrary
case folder or lab filename is automatically git-ignored.

## Safety and credentials

- **UAT, PROD and unknown environments are read-only.** Writes require an
  explicitly identified Sandbox, an approved scope and cleanup limited to
  resources created for that case.
- Use least-privilege identities. Azure permissions must enforce the boundary;
  instructions, skills, labels and browser allowlists are not authorization.
- Scripts load local `.env` configuration at runtime. Labs load local
  `test-search.config.js`. Both are git-ignored, and the agent must not read,
  print, copy or inline their contents.
- Configure a browser lab manually from
  [the placeholder example](test-search.config.example.js). Browser credentials
  are visible in DevTools; do not publish a configured lab or expose admin keys
  as if a read-only UI protected them.
- The current live browser runtime targets public Azure Search hosts
  (`*.search.windows.net`) and key-based configuration. Sovereign clouds and
  token authentication require explicit adaptation and testing.
- Requests, schemas, logs, IDs, screenshots and exports may be confidential
  even without keys. Sanitize and review them before sharing or committing.
- No bundled setup script, example or presentation action authorizes resource
  creation, indexer execution, document uploads or scaling.

## Local checks and maintenance

Requires Node.js 22 or later and Edge, Chrome or Chromium for browser checks.
Install the UI tooling from its existing lockfile, then run from the root:

```powershell
npm ci --prefix lab-kit
npm test
npm run update-guide
```

`npm test` checks customization metadata, local links, synchronized lab assets,
presentation interactions and responsive layout, lab behavior with stubbed
responses, relevance formulas and publication safeguards. Browser tests block
or stub remote traffic; they do not query real Azure resources.

`npm run update-guide` only refreshes embedded names, descriptions and declared
tools. It does not regenerate scenario text or certify access to those tools.

These checks demonstrate local tooling behavior, not agent reasoning quality,
Azure authentication, permissions or an improvement in real search relevance.
Verify discovery in your own VS Code installation before approving a narrowly
scoped resource read. Missing tools or failed calls must remain explicit.

Before publishing, run the checks, review `git status` and inspect the exact
content you intend to share. Do not include runtime secrets, personal MCP
configuration, dependencies or private cases.

## Troubleshooting

### GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) deploys automatically on pushes
to `main`. It publishes only the presentation and its explicitly selected assets,
not runtime configuration, labs, dependencies or private cases.

Run `npm run build:pages` to create the ignored `_site` directory locally.
Both the site root and `search-lab-explained.html` open the interactive guide.
Hosted documentation links point to source files in this repository; local
HTML links continue to work offline. No Azure resources are contacted.
The Measure step includes structured, explicitly synthetic mock outputs for
each workflow; these are examples, not agent executions or measured findings.

| Symptom | What to check |
| --- | --- |
| Agent or skill is missing | Open the repository root, check Agent Customizations and confirm Copilot supports the workspace customizations |
| An MCP tool is unavailable | Check trusted servers, enabled tools and the actual identifiers; report missing capabilities instead of claiming access |
| The agent can read Learn but not your service | Documentation access is separate from Azure authentication and resource permissions |
| MCP discovery fails in the agent | Validate discovery in that agent's context; success in another chat does not prove the agent's integration works |
| A query cannot be reproduced exactly through MCP | Use an approved REST/SDK script that preserves the request and API version |
| Relevance scoring rejects input | Check metadata, unique IDs, valid grades and judgments for every retrieved document within K |
| Browser checks cannot launch | Install Edge, Chrome or Chromium and ensure `npm ci --prefix lab-kit` completed |
| The HTML is static on GitHub | Open the downloaded local file in a browser rather than the GitHub source viewer |
| Tool descriptions in the HTML are outdated | Run `npm run update-guide`, then rerun the checks |

## Reuse in another workspace

Merge the [customizations](.github) into the destination project without
overwriting its existing instructions or agent definitions. Copy the shared
method, case template and catalog as appropriate. Include the lab runtime if
you want labs, and the HTML, [presentation assets](presentation-assets) and
updater if you want the presentation.

If you want this repository's tests and npm commands, also retain the root
package manifest and the lab tooling manifests. Preserve relative paths and
verify links after integration. Do not copy secrets, personal MCP settings,
private cases or installed dependencies.

Confirm tool names, authorized targets, schema fields and API versions for each
project. Reuse the method, not another project's assumptions or measurements.
All project documentation, case artifacts and UI text are maintained in English.

## References and license

- [VS Code custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [VS Code agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [MCP servers in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Azure MCP Search tools](https://learn.microsoft.com/azure/developer/azure-mcp-server/tools/azure-ai-search)
- [Azure AI Search documentation](https://learn.microsoft.com/azure/search/)

Original project material is licensed under [MIT](LICENSE). The imported
Microsoft Python skill retains its original license and recorded provenance;
see [third-party notices](THIRD-PARTY-NOTICES.md). This is not an official
Microsoft product.
