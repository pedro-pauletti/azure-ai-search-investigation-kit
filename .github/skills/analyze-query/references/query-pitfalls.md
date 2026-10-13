# Query pitfalls

- Reproduce every captured parameter, including filters, paging and api-version.
  A diagnostic baseline must be labeled assumption, never "production".
- Default scoring profiles can apply even when the request omits the parameter.
  Read the target definition before attributing ranking to an explicit profile.
- Fuzzy queries bypass lexical analysis of the query term. Prove collisions
  against the actual indexed tokens; changing searchAnalyzer is not a blanket fix.
  [Learn](https://learn.microsoft.com/azure/search/search-query-fuzzy).
- N-grams, stemming and fuzzy expansion may interact. Test the actual language,
  field scope and dictionary; do not assume one analyzer serves every UX.
- Isolate retrieval, fusion and reranking. Supported parameters vary by query
  mode/API version; unsupported features must be removed only in a labeled test,
  not silently from the reproduction.
- Raw user text and the application's lexical expression are different inputs.
  Preserve raw text when testing vectorization.
- Scores from different queries/configurations are not directly comparable.
  Ties and changing documents can make overlap noisy; establish repeatability.
- Weighting changes are not proof that unwanted candidates stop matching.
  Measure candidate counts, rank and recall separately.
- Removing a field also removes useful exact/prefix matches. Evaluate operator
  scoping and field contribution before recommending deletion.
- Tenant/security filters are correctness requirements. An unfiltered diagnostic
  must be authorized and never become a proposed application request by accident.
