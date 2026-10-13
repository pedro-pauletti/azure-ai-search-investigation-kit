#!/usr/bin/env node
/* validate-lab.cjs — checks a Search Lab before anyone trusts its numbers.
 *
 *   node .github/skills/build-search-lab/scripts/validate-lab.cjs <lab.html> [--no-smoke] [--shot out.png] [--json]
 *
 * 1. Static rules (no network): no inline keys, config-driven credentials, uses
 *    lab-core.js, no direct fetch, no write operations, provenance + limits + export present.
 * 2. Smoke test (headless Edge via playwright-core, optional): loads the lab with a
 *    FAKE config and a stubbed search service. Zero traffic reaches a real service.
 *    Fails on JS errors, on any request outside the read-only allowlist, and on
 *    requests to hosts other than the stub.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/\.png$/i.test(a));
const flag = f => args.includes(f);
const shotIdx = args.indexOf('--shot');
const shotPath = shotIdx >= 0 ? args[shotIdx + 1] : null;
if (!file) { console.error('usage: validate-lab.cjs <lab.html> [--no-smoke] [--shot out.png] [--json]'); process.exit(2); }

const abs = path.resolve(file);
const html = fs.readFileSync(abs, 'utf8');
const findings = [];
const add = (level, rule, msg) => findings.push({ level, rule, msg });

/* ------------------------------------------------------------ static */
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');

if (/(api-?key|adminKey|apiKey)['"]?\s*[:=]\s*['"`][A-Za-z0-9]{30,}['"`]/i.test(html) || /[A-Za-z0-9]{30,}AzSe[A-Za-z0-9]{4,}/.test(html))
  add('error', 'no-inline-keys', 'Looks like an Azure AI Search key is inlined. Keys belong in test-search.config.js (git-ignored).');
if (!/<script[^>]+src=["'][^"']*test-search\.config\.js["']/i.test(html))
  add('error', 'config-driven', 'Lab must load test-search.config.js for window.SEARCH_RESOURCES.');
if (!/<script[^>]+src=["'][^"']*lab-core\.js["']/i.test(html))
  add('error', 'uses-lab-core', 'Lab must load lab-kit/lab-core.js (allowlisted, logged, key-redacted requests).');
if (/\bfetch\s*\(/.test(scripts))
  add('error', 'no-direct-fetch', 'Call LabCore.search/analyze/getIndex/call instead of fetch() so the read-only allowlist and request log apply.');
if (/method\s*:\s*['"](PUT|DELETE|PATCH|MERGE)['"]/i.test(scripts) || /LabCore\.call\(\s*['"](PUT|DELETE|PATCH)/i.test(scripts))
  add('error', 'read-only', 'Write verbs are not allowed in a lab.');
if (/\/docs\/index\b|\/indexers\b|\/datasources\b|\/skillsets\b|\/synonymmaps\b/i.test(scripts))
  add('error', 'read-only', 'Lab references a write/admin surface (docs/index, indexers, datasources, skillsets, synonymmaps).');
const hasProdProv = /pill\(\s*['"]prod['"]|data-prov=["']prod|from production/i.test(html);
const hasAssumptionProv = /pill\(\s*['"]assumption['"]|data-prov=["']assumption|provA\s*:\s*['"]assumption['"]/i.test(html);
if (!hasProdProv && !hasAssumptionProv)
  add('warn', 'provenance', 'No provenance marker for A. Label it "from production" (copied from a captured request) or "assumption" (diagnostic baseline, G01).');
if (!/pill\(\s*['"](proposal|lab)['"]|lab decision|proposal/i.test(html))
  add('warn', 'provenance', 'No "proposal"/"lab decision" marker. Label what the lab chose.');
if (!/data-section=["']limits["']|limits\s*:/i.test(html))
  add('warn', 'limits', 'No "what this lab does not prove" section (data-section="limits" or CASE.limits).');
if (!/LabCore\.exportJson|LabCore\.copyMarkdown/.test(scripts))
  add('warn', 'evidence-export', 'No evidence export (LabCore.exportJson / copyMarkdown).');
if (!/id=["']lc-requests["']/.test(html))
  add('warn', 'requests-pane', 'No #lc-requests pane — reviewers cannot see the exact requests sent.');
if (!/id=["']lc-apiversion["']|apiVersion\s*:\s*['"]\d{4}-\d{2}-\d{2}/.test(html))
  add('warn', 'api-version', 'api-version is neither selectable nor pinned in CASE.');
if (/TODO\(lab\)/.test(html))
  add('warn', 'template-leftovers', 'Template TODO(lab) markers are still present.');
if (/<script[^>]+src=["']https?:/i.test(html) || /<link[^>]+href=["']https?:/i.test(html))
  add('warn', 'offline', 'Lab loads remote scripts/styles; labs should open from file:// without a CDN.');

/* -------------------------------------------------------------- smoke */
const ALLOWED = [
  ['GET', /^\/indexes$/], ['GET', /^\/indexes\/[^/]+$/], ['GET', /^\/indexes\/[^/]+\/stats$/], ['GET', /^\/servicestats$/],
  ['POST', /^\/indexes\/[^/]+\/docs\/(search|suggest|autocomplete)$/], ['POST', /^\/indexes\/[^/]+\/analyze$/],
];
const STUB_HOST = 'lab-smoke.search.windows.net';
const FAKE_CONFIG = `window.SEARCH_RESOURCES=[{label:"Smoke",endpoint:"https://${STUB_HOST}",apiKey:"smoke-query",adminKey:"smoke-admin",indexes:["smoke-index"]}];window.SEARCH_DEFAULT_INDEX="smoke-index";window.SEARCH_API_VERSION="2025-09-01";`;

function stubBody(method, p) {
  if (p === '/indexes') return { value: [{ name: 'smoke-index' }] };
  if (/\/analyze$/.test(p)) return { tokens: ['sample', 'document', 'text'].map((t, i) => ({ token: t, startOffset: i, endOffset: i + 1, position: i })) };
  if (/\/docs\/search$/.test(p)) return {
    '@odata.count': 3,
    value: [1, 2, 3].map(i => ({
      id: `doc-${i}`, title: `Smoke document ${i}`, '@search.score': 10 / i,
      '@search.features': { content: { uniqueTokenMatches: 1, similarityScore: 1, termFrequency: 1 } },
      '@search.highlights': { content: ['@@HL@@sample@@/HL@@ document', '<em>sample</em> document'] },
    })),
  };
  if (/^\/indexes\/[^/]+$/.test(p)) return { name: 'smoke-index', fields: [{ name: 'id', type: 'Edm.String', key: true }], analyzers: [], scoringProfiles: [] };
  return {};
}

function resolvePlaywright() {
  const roots = [process.env.PLAYWRIGHT_CORE_DIR, path.join(process.cwd(), 'lab-kit'), process.cwd(), __dirname, path.dirname(abs)].filter(Boolean);
  for (const r of roots) { try { return require(require.resolve('playwright-core', { paths: [r] })); } catch { /* next */ } }
  return null;
}

async function smoke() {
  const pw = resolvePlaywright();
  if (!pw) { add('warn', 'smoke-skipped', 'playwright-core not found (run `npm install` in lab-kit/). Static checks only.'); return null; }
  let browser;
  for (const channel of ['msedge', 'chrome', undefined]) {
    try { browser = await pw.chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); break; } catch { /* next */ }
  }
  if (!browser) { add('warn', 'smoke-skipped', 'No Chromium/Edge browser available for playwright-core.'); return null; }

  const report = { requests: [], violations: [], external: [], pageErrors: [], consoleErrors: [] };
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await context.route('**/*', async route => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.protocol === 'file:') {
      if (/test-search\.config\.js$/i.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_CONFIG });
      return route.continue();
    }
    if (u.hostname.endsWith('.search.windows.net')) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const entry = { method: req.method(), path: u.pathname, host: u.hostname };
      report.requests.push(entry);
      if (u.hostname !== STUB_HOST) { report.violations.push({ ...entry, why: 'real service host — lab must use the configured resource' }); return route.abort(); }
      if (!ALLOWED.some(([m, re]) => m === req.method() && re.test(u.pathname))) {
        report.violations.push({ ...entry, why: 'outside read-only allowlist' });
        return route.fulfill({ status: 403, headers: cors, contentType: 'application/json', body: '{"error":{"message":"blocked by smoke test"}}' });
      }
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(stubBody(req.method(), u.pathname)) });
    }
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    report.external.push(req.url());
    return route.abort();
  });

  const page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/blocked by smoke test|net::ERR_FAILED/i.test(m.text())) report.consoleErrors.push(m.text()); });
  await page.goto(pathToFileURL(abs).href);
  await page.waitForTimeout(800);
  const run = (await page.$('[data-smoke="run"]')) || (await page.$('button:has-text("Run")'));
  if (run) { await run.click().catch(() => {}); await page.waitForTimeout(1500); }
  else add('warn', 'smoke-run', 'No [data-smoke="run"] button; smoke only loaded the page.');
  for (const t of await page.$$('.tab')) { await t.click().catch(() => {}); await page.waitForTimeout(150); }
  if (shotPath) await page.screenshot({ path: path.resolve(shotPath), fullPage: false });
  await browser.close();

  report.pageErrors.forEach(e => add('error', 'smoke-js', `Uncaught error: ${e}`));
  report.consoleErrors.forEach(e => add('warn', 'smoke-console', e));
  report.violations.forEach(v => add('error', 'smoke-allowlist', `${v.method} ${v.host}${v.path}: ${v.why}`));
  report.external.forEach(u => add('warn', 'smoke-external', `External request blocked: ${u}`));
  if (!report.requests.some(r => /\/docs\/search$/.test(r.path))) add('warn', 'smoke-no-search', 'Run button did not issue any search request.');
  return report;
}

(async () => {
  const report = flag('--no-smoke') ? null : await smoke().catch(e => { add('error', 'smoke-crash', e.message); return null; });
  const errors = findings.filter(f => f.level === 'error').length;
  const warns = findings.filter(f => f.level === 'warn').length;
  if (flag('--json')) {
    console.log(JSON.stringify({ file: abs, errors, warns, findings, smoke: report }, null, 2));
  } else {
    console.log(`validate-lab: ${path.basename(abs)}`);
    for (const f of findings) console.log(`  ${f.level === 'error' ? '✖' : '⚠'} [${f.rule}] ${f.msg}`);
    if (report) console.log(`  smoke: ${report.requests.length} stubbed request(s): ${[...new Set(report.requests.map(r => `${r.method} ${r.path.replace(/\/indexes\/[^/]+/, '/indexes/{i}')}`))].join(', ') || 'none'}`);
    console.log(`  → ${errors} error(s), ${warns} warning(s)`);
  }
  process.exit(errors ? 1 : 0);
})();
