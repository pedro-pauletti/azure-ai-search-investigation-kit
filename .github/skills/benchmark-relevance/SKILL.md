---
name: benchmark-relevance
description: "Use when running Azure AI Search golden queries, comparing ranking configurations, computing NDCG, MRR, precision or recall, and checking relevance regressions. Requires explicit judgments and comparable measured runs."
---

# Benchmark Relevance

Follow [the shared method](../../azure-ai-search-method.md). A comparison without
judgments is a ranking comparison, not a measured relevance improvement.

## Procedure

1. Collect golden queries, stable query/document IDs, graded judgments and the
   relevance scale, cutoff K, required cohorts/languages and business criteria.
   Record judgment provenance and version. Ask for missing judgments; never
   infer relevance from a search score.
2. Define baseline and candidate configurations, exact API version, index/data
   snapshot, filters, vectorization, semantic settings and tie handling.
   Define regression thresholds, traffic budget and stopping conditions before
   measurement. Wait for approval.
3. Capture baseline and proposal with the same inputs/data and bounded repeated
   runs when needed. Record document IDs in rank order, failures, latency and
   exact sanitized requests. Do not treat failed queries as empty result sets.
4. Compute metrics using the offline [scorer](scripts/score-relevance.cjs):
   `node .github/skills/benchmark-relevance/scripts/score-relevance.cjs <input.json> <case>/results/NN_metrics.json`.
   See [the input and metric contract](references/metrics.md). The scorer makes
   no Azure calls and refuses unjudged retrieved documents within K.
5. Compare per-query effects, macro averages and cohorts. Report coverage,
   missing judgments, no-relevant-query exclusions and incomplete telemetry.
   Recall is relative to the judged pool, not an unjudged entire corpus.
6. Inspect regressions and possible confounders: unstable ties, changed content,
   cache/warmup, filters, repeated document IDs or differing request modes.
   Separate client latency from service latency.
7. Publish measurements with metadata/input links. Do not claim statistical
   significance without a specified method and sufficient independent samples.
   Use [build-search-lab](../build-search-lab/SKILL.md) only for useful inspection;
   overlap/count changes in a lab are not judgment-based relevance metrics.

## Output

Golden-query and judgment versions, baseline/candidate definitions, metric
formulas and cutoff, coverage, per-query/cohort comparisons, regressions,
acceptance verdict and limitations. Save inconclusive comparisons explicitly.

Reference: [relevance and scoring](https://learn.microsoft.com/azure/search/index-similarity-and-scoring).
