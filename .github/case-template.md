# <case> - <question>

- Workflow: `<diagnose-indexer | analyze-query | benchmark-relevance | review-capacity>`
- Status: `<complete | inconclusive | blocked>`
- Environment / service / index or indexer: `<identifiers without secrets>`
- Measured at: `<ISO with timezone>`; api-version: `<version>`
- Baseline source: `<captured | assumption>`; source reference: `<ticket/log/file>`

## Verdict

| Claim | Outcome | Evidence |
| --- | --- | --- |
| <original suspicion> | <supported/refuted/open> | [result](results/NN_result.json) |

## Problem and context

<Expected versus observed behavior, scope, confirmed context and missing information.>

## Approved plan and hypotheses

| Hypothesis | Test | Falsification criterion | Status | Evidence |
| --- | --- | --- | --- | --- |
| <hypothesis> | <script/query> | <criterion> | <status> | <file> |

## Baseline, proposal and mechanism

<Exact sanitized requests; isolated differences and an evidence-backed explanation.
Do not attribute stub results to the real environment.>

## Acceptance criteria and results

| Criterion | Baseline | Proposal | Source / limitation |
| --- | --- | --- | --- |
| <criterion defined before testing> | <measurement> | <measurement> | <file/date> |

## Rejected alternatives

<What did not solve the problem and which measurement refuted the alternative.>

## Recommendation and limitations

<Action, risk, environment, measured impact and what has not been demonstrated.
If blocked/inconclusive, record gaps and the next required measurement.>

## How to reproduce

<Prerequisites without credentials; commands in order; approved environment and limits.
Link to the lab, if any, and its validator result.>

## Official references

<Microsoft Learn pages, access date and applicable versions.>

## Retro

- Candidate lesson: `<rule and evidence file>`
- Reusable check or asset: `<proposal, not automatic application>`
- Gaps and risks: `<outstanding items>`
