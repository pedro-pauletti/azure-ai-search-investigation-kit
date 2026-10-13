#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const METRICS = ['ndcgAtK', 'rrAtK', 'precisionAtK', 'recallAtK'];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(value, name) {
  requireValue(typeof value === 'string' && value.trim().length > 0, `${name} must be a non-empty string.`);
}

function rankingMetrics(ids, judgments, k) {
  const grades = ids.slice(0, k).map(id => judgments[id]);
  const relevant = grades.filter(grade => grade > 0).length;
  const pool = Object.values(judgments);
  const totalRelevant = pool.filter(grade => grade > 0).length;
  const dcg = values => values.reduce((sum, grade, i) => sum + (2 ** grade - 1) / Math.log2(i + 2), 0);
  const ideal = dcg([...pool].sort((a, b) => b - a).slice(0, k));
  const first = grades.findIndex(grade => grade > 0);
  return {
    ndcgAtK: dcg(grades) / ideal,
    rrAtK: first < 0 ? 0 : 1 / (first + 1),
    precisionAtK: relevant / k,
    recallAtK: relevant / totalRelevant,
  };
}

function score(input) {
  requireValue(input && typeof input === 'object' && !Array.isArray(input), 'Input must be an object.');
  requireValue(input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta), 'meta is required.');
  for (const key of ['date', 'environment', 'service', 'index', 'apiVersion', 'judgmentsVersion', 'dataSnapshot', 'baselineConfig', 'proposalConfig']) {
    requireText(input.meta[key], `meta.${key}`);
  }
  requireValue(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(input.meta.date) && Number.isFinite(Date.parse(input.meta.date)), 'meta.date must be an ISO timestamp with timezone.');
  requireValue(Number.isSafeInteger(input.k) && input.k > 0, 'k must be a positive safe integer.');
  requireValue(Array.isArray(input.queries) && input.queries.length > 0, 'queries must be a non-empty array.');
  const seen = new Set();
  const queries = input.queries.map(query => {
    requireValue(query && typeof query === 'object' && !Array.isArray(query), 'Each query must be an object.');
    requireText(query.id, 'query.id');
    requireText(query.text, `${query.id}.text`);
    requireValue(!seen.has(query.id), `Duplicate query ID: ${query.id}`);
    seen.add(query.id);
    const judgments = query.judgments;
    requireValue(judgments && typeof judgments === 'object' && !Array.isArray(judgments) && Object.keys(judgments).length > 0, `${query.id}: judgments must be a non-empty object.`);
    for (const [id, grade] of Object.entries(judgments)) {
      requireText(id, `${query.id}: judged document ID`);
      requireValue(Number.isInteger(grade) && grade >= 0 && grade <= 4, `${query.id}: judgment for ${id} must be an integer from 0 to 4.`);
    }
    for (const side of ['baseline', 'proposal']) {
      requireValue(Array.isArray(query[side]), `${query.id}.${side} must be an array of document IDs.`);
      const ids = query[side];
      ids.forEach(id => requireText(id, `${query.id}.${side}: document ID`));
      requireValue(new Set(ids).size === ids.length, `${query.id}.${side}: duplicate document IDs.`);
      for (const id of ids.slice(0, input.k)) {
        requireValue(Object.hasOwn(judgments, id), `${query.id}.${side}: unjudged document ${id} within K.`);
      }
    }
    if (!Object.values(judgments).some(grade => grade > 0)) {
      return { id: query.id, status: 'no-relevant-judgments', baseline: null, proposal: null, delta: null };
    }
    const baseline = rankingMetrics(query.baseline, judgments, input.k);
    const proposal = rankingMetrics(query.proposal, judgments, input.k);
    const delta = Object.fromEntries(METRICS.map(metric => [metric, proposal[metric] - baseline[metric]]));
    return { id: query.id, status: 'evaluated', baseline, proposal, delta };
  });
  const evaluated = queries.filter(query => query.status === 'evaluated');
  requireValue(evaluated.length > 0, 'No query has positive relevance judgments; no aggregate can be computed.');
  const mean = side => Object.fromEntries(METRICS.map(metric => [metric, evaluated.reduce((sum, query) => sum + query[side][metric], 0) / evaluated.length]));
  return {
    meta: { ...input.meta, scoredAt: new Date().toISOString() },
    k: input.k,
    coverage: { total: queries.length, evaluated: evaluated.length, excludedNoRelevant: queries.length - evaluated.length },
    aggregate: { baseline: mean('baseline'), proposal: mean('proposal'), delta: mean('delta') },
    queries,
  };
}

if (require.main === module) {
  try {
    const [source, output, ...extra] = process.argv.slice(2);
    requireValue(source && output && extra.length === 0, 'usage: score-relevance.cjs <input.json> <new-output.json>');
    const report = score(JSON.parse(fs.readFileSync(source, 'utf8')));
    report.meta.source = path.resolve(source);
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    if (report.coverage.excludedNoRelevant) console.warn(`Excluded ${report.coverage.excludedNoRelevant} query/query groups without relevant judgments; see coverage.`);
    console.log(`Saved relevance metrics: ${output}`);
  } catch (error) {
    console.error(`score-relevance: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { score };
