# Offline metric contract

The scorer reads only the supplied JSON; it does not access Azure or secret
configuration. Input contains `meta`, `k` and `queries`; each query has `id`,
`text`, `judgments` (an object mapping document IDs to integer grades from 0 to 4),
`baseline` and `proposal` (arrays of IDs in ranked order).

`meta` requires nonempty strings: `date` (ISO with timezone), `environment`,
`service`, `index`, `apiVersion`, `judgmentsVersion`, `dataSnapshot`,
`baselineConfig` and `proposalConfig`. Capture these values from real measurements.
K must be a positive integer. Query IDs must be unique, and document IDs must not
repeat within a ranking; every returned document within K needs an explicit
judgment. Collection failures must be resolved or reported separately, never
converted into empty arrays by the collector.

Run from the project root:
`npm run score:relevance -- <input> <new-output>`.

## Formulas

- Relevant: grade greater than zero.
- Precision@K: relevant documents returned within K / K, including short rankings.
- Recall@K: relevant documents returned within K / relevant documents in the judged
  pool. This is not recall over the entire corpus unless judgments are exhaustive.
- RR@K: reciprocal of the first relevant rank within K; zero if there is no hit.
  The macro average of RR@K is MRR@K.
- DCG@K: sum of `(2^grade - 1) / log2(rank + 1)`, with ranks starting at 1.
- NDCG@K: DCG / ideal DCG, sorting all judged grades and truncating at K.

Queries without any judged relevant documents do not allow recall and NDCG
normalization. They are preserved with `status: no-relevant-judgments` and null
metrics, explicitly excluded from all averages. `coverage` reports the
denominators. The scorer fails if no query can be evaluated. Negative queries
must be assessed with a separate criterion, not by inventing relevance.

Output preserves `meta` and adds `scoredAt`, `source`, coverage, per-query metrics,
macro averages for each configuration and `proposal - baseline` deltas.
The output file must be new: the scorer does not overwrite existing evidence.
Do not include credentials or confidential content in the input.
