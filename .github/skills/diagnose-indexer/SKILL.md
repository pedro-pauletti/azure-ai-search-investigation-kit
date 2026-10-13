---
name: diagnose-indexer
description: "Use when diagnosing Azure AI Search indexer failures, connectivity, authentication, data sources, field mappings, output mappings, skillsets, enrichment or execution history. Produce a read-only evidence-backed diagnosis."
---

# Diagnose Indexer

Follow [the shared method](../../azure-ai-search-method.md). This is diagnosis,
not permission to create, run, reset or update an indexer.

## Procedure

1. Gather service, indexer, target index, data source type, api-version, exact
   error/warnings, affected executions/documents and expected versus actual
   behavior. Separate data access, enrichment and document indexing stages.
2. Check [the case catalog](../../../CASE-CATALOG.md), then propose hypotheses,
   alternatives and a bounded read-only evidence plan. Wait for approval.
3. Discover Azure MCP capabilities. If indexer reads are not exposed, use exact
   REST GETs or the Python SDK after loading
   [azure-search-documents-py](../azure-search-documents-py/SKILL.md).
4. Save sanitized status and execution history, indexer definition, target schema
   and relevant mapping/skillset structure. Fetch only authorized definitions;
   omit connection strings, tokens and credential-bearing fields at runtime.
5. Diagnose by layer:
   - connectivity: firewall, private endpoints, DNS and source reachability;
   - authentication: identity, role scope, source permissions and expired access;
   - mappings: source/target field names, types, collection shape and functions;
   - enrichment: skill inputs/outputs/context, dependencies and warnings;
   - indexing: per-document failures, limits, timeouts, throttling and schedule.
   A failure naming an index does not prove the index is the root cause.
6. Compare successful and failed executions within the available history.
   Distinguish transient events, recurring failures and incomplete evidence.
   Do not probe a production data source or trigger execution without approval.
7. Confirm the suspected behavior on Microsoft Learn, scoped to data source,
   skill and API version. Save scripts/results, hypotheses and recommendations.
   Validate a repair only on an authorized Sandbox clone; never claim an
   unexecuted repair is proven.
8. A lab is optional: a sanitized mapping/error explanation may help. Use
   [build-search-lab](../build-search-lab/SKILL.md); do not add live credential
   exports or indexer run/reset controls to a browser lab.

## Acceptance and output

Report the failing stage, exact sanitized evidence, refuted alternatives,
recommended action, validation status and limitations. Criteria may include
successful Sandbox execution, correct mapped values and no unexpected document
failures. Without authorized execution, label the fix as unvalidated.

References: [indexer troubleshooting](https://learn.microsoft.com/azure/search/search-indexer-troubleshooting),
[execution errors](https://learn.microsoft.com/azure/search/cognitive-search-common-errors-warnings),
[field mappings](https://learn.microsoft.com/azure/search/search-indexer-field-mappings).
