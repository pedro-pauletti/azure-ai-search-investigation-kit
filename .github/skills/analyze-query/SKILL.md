---
name: analyze-query
description: "Use when explaining Azure AI Search query behavior, unexpected matches, missing documents, ranking, filters, analyzers, fuzzy/n-gram, scoring profiles, semantic ranker or hybrid/vector retrieval. Reproduce the exact request and isolate causes."
---

# Analyze Query

Follow [the shared method](../../azure-ai-search-method.md). Load SDK support
only if implementing Python calls; use REST when it preserves the request better.

## Procedure

1. Collect raw user text and the exact application request: API version, fields,
   queryType/searchMode, filters, scoring profile/parameters, orderby, facets,
   paging, semantic configuration and vector queries. Record expected document
   IDs/ranks and actual output. Do not import another project's request.
2. Read [query pitfalls](references/query-pitfalls.md). Propose hypotheses plus
   an alternative, refutation tests and relevant regression criteria. Wait for
   approval before calls. Missing request means an assumption-labeled baseline.
3. Reproduce unchanged and save `results/01_reproduce.json`. If the symptom does
   not reproduce, report it before changing the question.
4. Capture the relevant schema: searchable/filterable/sortable fields, analyzers,
   default scoring profile, semantic configuration and vectorizer/profile.
   Record differences between environments or snapshots.
5. Ablate one dimension per test: filter, field, operator, profile, lexical leg,
   vector leg or semantic reranking. Preserve raw text for vectorization rather
   than embedding a Lucene expression. Do not compare scores across queries.
6. For lexical/token claims, analyze exact indexed text and calculate relevant
   token distances. Highlights or supported search features attribute matches,
   but alone do not prove the mechanism. For hybrid/semantic claims, inspect
   candidate generation, fusion and reranking separately.
7. Measure related queries and permissions/filters that must remain correct.
   Use typo/partial-term checks only where that UX is required. If proposing
   fuzzy scoping, measure exact/prefix recall before dropping a field.
8. Verify applicable behavior on Learn. Save exact A/B requests, sources,
   results and limits. An interactive comparison is optional:
   [build-search-lab](../build-search-lab/SKILL.md).

## Output

Explain the mechanism, not just a better-looking result. Report hypothesis
statuses, observed effects, acceptance checks, rejected alternatives and gaps.
Escalate to [benchmark-relevance](../benchmark-relevance/SKILL.md) for a
golden-query evaluation; a single query does not prove overall relevance.

References: [query overview](https://learn.microsoft.com/azure/search/search-query-overview),
[hybrid search](https://learn.microsoft.com/azure/search/hybrid-search-overview),
[semantic ranking](https://learn.microsoft.com/azure/search/semantic-search-overview).
