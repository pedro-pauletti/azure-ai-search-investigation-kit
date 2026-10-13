---
name: review-capacity
description: "Use when reviewing Azure AI Search performance, document/vector volume, latency, throttling, replicas, partitions, tier, index characteristics or indexing/query contention. Produce recommendations from authorized telemetry."
---

# Review Capacity

Follow [the shared method](../../azure-ai-search-method.md). This is a review,
not permission to scale resources or run production load tests.

## Procedure

1. Gather service tier, region/creation characteristics, replicas/partitions,
   shared indexes, document/storage/vector volume, query/indexing workload,
   concurrency, latency goals and observed incidents. Verify current facts,
   available metric retention and the analysis window; do not assume capacity.
2. Define the time range, UTC boundaries, sampling/aggregation, units, baseline,
   acceptance targets and a bounded evidence plan. Separate telemetry reads
   from active load tests. Wait for approval before either.
3. Discover read-only Search/Monitor/Kusto/resource health capabilities and
   authorization. Save sanitized service/index stats and time-series evidence.
   Missing logs/metrics must be reported; do not replace them with estimates
   presented as measurements.
4. Correlate request volume, service/client latency, throttling, errors, indexing
   activity and changes across the window. Service-level failures can affect
   multiple indexes. Check per-document indexing outcomes, not only HTTP status.
5. Assess schema/query cost: searchable/filterable/facetable fields, analyzers,
   vector dimensions/algorithms, semantic reranking, filters, paging and payload
   sizes. Different workloads require controlled tests, not blanket prescriptions.
6. Analyze whether query concurrency, indexing/storage pressure, skew, expensive
   requests or shared-service contention best explains the observations.
   Distinguish measured cause, correlation and an untested hypothesis.
7. Validate replica/partition/tier tradeoffs on Microsoft Learn for the actual
   service. Do not claim that replicas always solve queries or partitions always
   solve indexing. Cost estimates need a dated pricing source and assumptions,
   separate from measured metrics.
8. If active benchmarking is needed, request explicit environment, concurrency,
   duration/request cap and abort thresholds. Use an authorized Sandbox;
   production load, scaling and configuration changes require a separate
   approved operational process and are outside this workflow.
9. A lab may display saved telemetry and scenarios. It must not run load or
   scaling actions: [build-search-lab](../build-search-lab/SKILL.md).

## Output

Window/coverage, workload and index inventory, measured bottlenecks,
alternative hypotheses, recommendation with tradeoffs, unvalidated scenarios,
acceptance goals and limits. Do not derive p95/p99 by averaging interval means
or percentiles; name the aggregation and source accurately.

References: [performance analysis](https://learn.microsoft.com/azure/search/search-performance-analysis),
[capacity planning](https://learn.microsoft.com/azure/search/search-capacity-planning),
[monitoring](https://learn.microsoft.com/azure/search/monitor-azure-cognitive-search).
