# Lab patterns and `LabCore` API

## Layout every lab follows

- **Header**: title + the question in one line; Service / Index / api-version
  selectors (`#lc-resource`, `#lc-index`, `#lc-apiversion`); environment badge
  (`#lc-env`, red for PROD); Shot mode, JSON export, Markdown copy; the run button
  carries `data-smoke="run"` so the validator can click it.
- **Sidebar**: inputs, then the A and B request bodies rendered read-only with
  provenance pills, then **"What this lab does not prove"** (`data-section="limits"`).
- **Board**: A — Today (`pill('prod')`) vs B — Proposal (`pill('proposal')`),
  big counts.
- **Tabs** (`.tab[data-pane]` + `section.pane`):
  1. *Side by side* — ranked docs, docs missing on the other side highlighted.
  2. *Matrix* — every query: counts, Δ, overlap@K, top-1 change, latency.
  3. *Why it matched* — fields from `@search.features`, highlighted surface forms,
     edit distance to the term.
  4. *Analyzer* — Analyze API tokens per analyzer; tokens within distance 1 in red.
  5. *Requests / parity* — production-format GET + request log (keys redacted).
  Add case-specific tabs (e.g. "Fields", "Scopes") when the question needs them.

## Provenance vocabulary (`LabCore.pill(kind, text?)`)

| kind | meaning |
|---|---|
| `prod` | copied from the production request/ticket/logs |
| `proposal` | the change under test |
| `lab` | a choice the lab made that production does not have |
| `measured` | a constant measured by a script (say which, and when) |
| `assumption` | not verified yet — must become `measured` or be listed in limits |

## `LabCore` API (lab-kit/lab-core.js)

| call | does |
|---|---|
| `await LabCore.init({ defaultResource, defaultIndex, apiVersion, onIndexChange })` | fills selectors from `window.SEARCH_RESOURCES`, lists indexes (admin key) or falls back to `indexes` in config, wires tabs |
| `await LabCore.search(body, { index?, label? })` | `{ count, docs, ms, raw }` via POST docs/search (query key) |
| `await LabCore.analyze(text, analyzer, { index? })` | tokens (admin key) |
| `await LabCore.getIndex(name?)` | index definition: fields, analyzers, scoringProfiles (admin key) |
| `await LabCore.call(method, path, body?, opts?)` | any **allowlisted** read-only call; everything else throws |
| `LabCore.overlapAtK(aIds, bIds, K)` | `{ ratio, inter, onlyA, onlyB, top1Same }` |
| `LabCore.editDistance(a, b)` | Damerau (OSA) distance, as fuzzy `~n` counts edits |
| `LabCore.scopedFuzzy(text, fields, n?)` | exact term on every field + `field:term~n` only on `fields`, per token (G12) |
| `LabCore.luceneEscape(term)` | escapes Lucene special characters |
| `LabCore.extractMarks(fragment, pre, post)` | surface forms inside highlight tags |
| `LabCore.parityGetUrl(body)` | GET URL production would fire (no key) |
| `LabCore.exportJson(prefix, payload)` | downloads `{ meta, ...payload, requests }` |
| `LabCore.copyMarkdown(headers, rows)` | Markdown table to clipboard |
| `LabCore.banner(kind, html)` / `clearBanner()` | `ok` · `warn` · `err` |
| `LabCore.toggleShotMode()` | hides controls for screenshots |

Allowlist: `GET /indexes`, `GET /indexes/{i}`, `GET /indexes/{i}/stats`,
`GET /servicestats`, `POST /indexes/{i}/docs/{search|suggest|autocomplete}`,
`POST /indexes/{i}/analyze`. Only `https://*.search.windows.net`.

## Scripts next to the lab

The lab is for exploring and showing; **numbers in the README come from scripts**
(repeatable, versioned) or from lab exports saved to `results/`.

```
<case>/
  README.md                 # .github/case-template.md
  scripts/common.py         # loads root .env; read-only helpers
  scripts/01_<question>.py  # one question per script, writes results/01_*.json
  results/
  evidence/                 # screenshots (validate-lab --shot or Playwright)
<case>-lab.html             # at the workspace root, next to test-search.config.js
```

Minimal `common.py` for read-only calls:

```python
import json, os, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[2]
def env():
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
def search(endpoint, key, index, body, api):
    req = urllib.request.Request(f"{endpoint}/indexes/{index}/docs/search?api-version={api}",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "api-key": key})
    with urllib.request.urlopen(req) as r: return json.load(r)
```

Field-scoped fuzzy in a lab: `LabCore.scopedFuzzy('sample', identityFields, 1)`.
Select identity fields from the target schema, not from another project's lab.
