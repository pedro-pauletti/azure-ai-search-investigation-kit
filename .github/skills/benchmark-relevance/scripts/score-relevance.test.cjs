'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { score } = require('./score-relevance.cjs');

function fixture() {
  return {
    meta: { date: '2026-10-12T21:00:00Z', environment: 'offline-fixture', service: 'fixture', index: 'fixture', apiVersion: '2025-09-01', judgmentsVersion: 'fixture', dataSnapshot: 'fixture', baselineConfig: 'A', proposalConfig: 'B' },
    k: 2,
    queries: [{ id: 'q1', text: 'sample', judgments: { a: 3, b: 1, c: 0 }, baseline: ['c', 'b'], proposal: ['a', 'b'] }],
  };
}

test('graded NDCG and binary metrics use exact cutoff and judged-pool denominator', () => {
  const report = score(fixture());
  const ideal = 7 + 1 / Math.log2(3);
  assert.equal(report.queries[0].baseline.ndcgAtK, (1 / Math.log2(3)) / ideal);
  assert.equal(report.queries[0].proposal.ndcgAtK, 1);
  assert.equal(report.aggregate.baseline.rrAtK, 0.5);
  assert.equal(report.aggregate.baseline.precisionAtK, 0.5);
  assert.equal(report.aggregate.baseline.recallAtK, 0.5);
  assert.equal(report.aggregate.proposal.precisionAtK, 1);
  assert.equal(report.aggregate.delta.rrAtK, 0.5);
});

test('short and empty rankings keep precision denominator K', () => {
  const input = fixture();
  input.queries[0].baseline = [];
  input.queries[0].proposal = ['a'];
  const report = score(input);
  assert.equal(report.aggregate.baseline.ndcgAtK, 0);
  assert.equal(report.aggregate.baseline.rrAtK, 0);
  assert.equal(report.aggregate.proposal.precisionAtK, 0.5);
  assert.equal(report.aggregate.proposal.recallAtK, 0.5);
});

test('exclusions remain visible and do not dilute macro averages', () => {
  const input = fixture();
  input.queries.push({ id: 'negative', text: 'none', judgments: { c: 0 }, baseline: ['c'], proposal: [] });
  const report = score(input);
  assert.deepEqual(report.coverage, { total: 2, evaluated: 1, excludedNoRelevant: 1 });
  assert.equal(report.queries[1].status, 'no-relevant-judgments');
  assert.equal(report.queries[1].proposal, null);
  assert.equal(report.aggregate.proposal.ndcgAtK, 1);
});

test('rejects unjudged hits, duplicate IDs, invalid grades, missing metadata and invalid K', () => {
  for (const [mutate, message] of [
    [input => { input.queries[0].proposal = ['unknown']; }, /unjudged/],
    [input => { input.queries[0].proposal = ['a', 'a']; }, /duplicate document/],
    [input => { input.queries.push(input.queries[0]); }, /Duplicate query/],
    [input => { input.queries[0].judgments.a = -1; }, /integer from 0 to 4/],
    [input => { delete input.meta.apiVersion; }, /meta.apiVersion/],
    [input => { input.meta.date = '2026-10-12'; }, /timezone/],
    [input => { input.k = 0; }, /positive safe integer/],
    [input => { input.queries[0].judgments = { c: 0 }; input.queries[0].baseline = ['c']; input.queries[0].proposal = []; }, /No query/],
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => score(input), message);
  }
});
