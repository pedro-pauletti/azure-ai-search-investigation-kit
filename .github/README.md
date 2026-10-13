# Reusable Azure AI Search tooling

One agent: [azure-ai-search-engineer](agents/azure-ai-search-engineer.agent.md).
Skills: [diagnose-indexer](skills/diagnose-indexer/SKILL.md),
[analyze-query](skills/analyze-query/SKILL.md),
[benchmark-relevance](skills/benchmark-relevance/SKILL.md),
[review-capacity](skills/review-capacity/SKILL.md),
[build-search-lab](skills/build-search-lab/SKILL.md) and
[Microsoft Python SDK](skills/azure-search-documents-py/SKILL.md).

Flow: context and previous cases -> select a workflow -> approve the plan ->
reproduce/measure -> conclude -> optional lab -> `/save-search-case` ->
optional `/retro`, with approval before changes.

## Use in another project

Copy the customizations in this folder, [lab-kit/](../lab-kit/),
[CASE-CATALOG.md](../CASE-CATALOG.md),
[search-lab-explained.html](../search-lab-explained.html),
[presentation-assets/](../presentation-assets/) and
[update-explainer.cjs](../update-explainer.cjs); merge existing instructions
instead of overwriting them. Do not copy private cases, secrets or local
configuration files. Start the destination catalog without private case entries.
Preserve the scripts and assets required by the copied tooling and integrate the
root npm commands from [package.json](../package.json).

The agent does not assume a schema, hosts or environment. Provide project
identifiers and constraints for each case. Write all project artifacts,
including documentation, README files, team notes and lab UI, in English.
User conversations may follow the user's language.
Install tooling only when needed; `npm ci` in `lab-kit/` prepares the
validator with `playwright-core` and requires an available Edge/Chromium browser.
Python scripts need the dependencies they actually use; the skill does not
automatically install the SDK, authenticate or grant permissions.

## Azure MCP and Microsoft Learn

Enable trusted servers in VS Code and check **Configure Tools**.
This configuration uses the `azure` server with `search`, `monitor`, `kusto` and
`resourcehealth`, and `microsoft-docs/*` for Learn. Identifiers vary by
installation/harness: if a server has another name, adjust only the identifiers
in the agent's `tools` field to the actual names shown by the editor.
Do not enable every Azure operation indiscriminately.

- Azure Search: discover commands/schemas before accessing resources.
- Monitor/Kusto/resource health: authorized telemetry reads.
- Learn: official search/fetch/code samples; do not send secrets/private data.
- REST/SDK: exact requests and operations not covered by MCP.

The MCP query wrapper may change the retrieval mode depending on its schema.
Do not use it as a faithful reproduction unless it preserves the request.
First verify server availability and a Learn search/fetch.
Resource-access queries require an approved plan and an authorized identity.
Tool availability does not prove authentication, API coverage or permissions
on a service.

## Safety and configuration

UAT/PROD and unknown environments are read-only. Least-privilege credentials
and Azure authorization must enforce this; instructions alone are not enough.
Changes are allowed only in an explicitly approved Sandbox. Labs do not write.

The user configures `.env` locally for scripts and `test-search.config.js`
for labs. Both are git-ignored; the agent never reads their contents.
Use [the secret-free sample](skills/build-search-lab/assets/test-search.config.example.js).
The current browser runtime uses keys and public Azure hosts `*.search.windows.net`;
sovereign clouds or token authentication require explicit adaptation and
allowlist tests. Do not claim support for these scenarios without validating it.

## Preserve and improve

[/save-search-case](prompts/save-search-case.prompt.md) saves evidence and updates
[the catalog](../CASE-CATALOG.md), including inconclusive cases.
[/retro](prompts/retro.prompt.md) proposes improvements; it does not apply them
or commit automatically. Historical cases remain untouched.

Run these commands from the project root:

- `npm test`: offline methodology/UI checks and relevance scorer tests.
- `npm run update-guide`: refresh the offline presentation.
- `npm run score:relevance -- <input> <new-output>`: score a saved relevance
  input without Azure access. Follow [the metric contract](skills/benchmark-relevance/references/metrics.md);
  the output path must be new.

The HTML is a short interactive guide with two views: an agent map
(tools, sources, access boundaries and usage) and a case walkthrough.
Click nodes to explore capabilities, choose a problem, simulate approval and
copy a starter prompt. No button makes Azure calls.
Each step's example simulates Copilot chat with messages, agent selection,
expandable tool activity and illustrative approval.
The composer is visual only; it does not send messages or execute tools.
The Light/Dark button changes only the chat theme and preserves the choice in
the URL. The larger chat window allows vertical scrolling in the walkthrough.
In the Lab step, a collapsible preview mirrors the generated template's header,
request sidebar, comparison board and tabs. Saved-evidence previews omit run
controls. All previews use synthetic content and disabled controls, without
real requests. The chat and preview styles load from a local presentation asset.
The displayed tool identifiers come from the agent's frontmatter; they do not
represent verification of authentication or permissions.
Technical details are collapsed, and links open the original files.
The generator embeds only discovery metadata and declared tools, not complete
documents.

Validate a root-level lab from the project root:
`node .github/skills/build-search-lab/scripts/validate-lab.cjs <case>-lab.html`.
Stub results are not Azure measurements.

`npm test` in `lab-kit/` remains available for its offline methodology/UI checks.

References:
[custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents),
[MCP in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers),
[Azure MCP Search](https://learn.microsoft.com/azure/developer/azure-mcp-server/tools/azure-ai-search),
[Azure AI Search](https://learn.microsoft.com/azure/search/).
