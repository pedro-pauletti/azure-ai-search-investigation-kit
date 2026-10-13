/* lab-core.js — shared runtime for Search Labs (read-only Azure AI Search).
 *
 * Canonical copy: .github/skills/build-search-lab/assets/lab-kit/lab-core.js
 * Deployed copy:  <workspace>/lab-kit/lab-core.js (loaded by every lab)
 *
 * What it gives a lab, so the lab only has to hold case-specific logic:
 *   - resource / index / api-version selection from window.SEARCH_RESOURCES
 *     (test-search.config.js — never hardcode keys in a lab);
 *   - an allowlisted, read-only request layer (search, analyze, index definition)
 *     that picks the right key and logs every request with the key redacted;
 *   - UI helpers: banner, tabs, provenance pills, requests pane, screenshot mode;
 *   - analysis helpers: edit distance (as Azure fuzzy measures it), overlap@K;
 *   - evidence helpers: JSON export with run metadata, Markdown table copy,
 *     production-format GET URL for parity checks.
 */
(function (global) {
  'use strict';

  const VERSION = '1.1.0';
  const DEFAULT_API_VERSION = '2025-09-01';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = { requests: [], onIndexChange: null, labName: document.title || 'search-lab' };

  /* ----------------------------------------------------------- resources */

  function resources() { return Array.isArray(global.SEARCH_RESOURCES) ? global.SEARCH_RESOURCES : []; }

  function resource() {
    const list = resources();
    const sel = $('lc-resource');
    return (sel && list[sel.selectedIndex]) || list[0] || null;
  }

  function endpoint() { const r = resource(); return r ? String(r.endpoint || '').replace(/\/+$/, '') : ''; }

  function apiVersion() {
    const e = $('lc-apiversion');
    return (e && e.value.trim()) || global.SEARCH_API_VERSION || DEFAULT_API_VERSION;
  }

  function indexName() { const e = $('lc-index'); return e ? e.value.trim() : ''; }

  function isProd(r) { return !!r && /prod/i.test(String(r.label || '')); }

  /* ------------------------------------------------ read-only request layer */

  // Every lab request goes through this list. Anything that writes (index/doc
  // upload, indexers, data sources, skillsets, PUT/DELETE/PATCH) is rejected here.
  const ALLOWED = [
    { method: 'GET',  re: /^\/indexes$/,                          key: 'admin', what: 'list indexes' },
    { method: 'GET',  re: /^\/indexes\/[^/]+$/,                   key: 'admin', what: 'index definition' },
    { method: 'GET',  re: /^\/indexes\/[^/]+\/stats$/,            key: 'admin', what: 'index stats' },
    { method: 'GET',  re: /^\/servicestats$/,                     key: 'admin', what: 'service stats' },
    { method: 'POST', re: /^\/indexes\/[^/]+\/docs\/search$/,     key: 'query', what: 'search' },
    { method: 'POST', re: /^\/indexes\/[^/]+\/docs\/suggest$/,    key: 'query', what: 'suggest' },
    { method: 'POST', re: /^\/indexes\/[^/]+\/docs\/autocomplete$/, key: 'query', what: 'autocomplete' },
    { method: 'POST', re: /^\/indexes\/[^/]+\/analyze$/,          key: 'admin', what: 'analyze' },
  ];

  function rule(method, path) {
    return ALLOWED.find(a => a.method === method && a.re.test(path)) || null;
  }

  function assertAllowed(method, urlString) {
    const url = new URL(urlString);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.search.windows.net') || url.username || url.password) {
      throw new Error('Blocked endpoint: only HTTPS *.search.windows.net hosts are allowed.');
    }
    const r = rule(method, url.pathname);
    if (!r) throw new Error(`Blocked operation: ${method} ${url.pathname} is not in the lab read-only allowlist.`);
    return r;
  }

  function keyFor(kind) {
    const r = resource();
    if (!r) return '';
    const q = String(r.apiKey || '').trim();
    const a = String(r.adminKey || '').trim();
    // Analyze / index definition need an admin key; search works with a query key.
    return kind === 'admin' ? (a || q) : (q || a);
  }

  function redact(value) {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = /key/i.test(k) ? '[redacted]' : redact(v);
      return out;
    }
    return value;
  }

  async function call(method, path, body, opts = {}) {
    const base = opts.endpoint || endpoint();
    if (!base) throw new Error('No search resource configured. Check test-search.config.js.');
    const url = `${base}${path}${path.includes('?') ? '&' : '?'}api-version=${encodeURIComponent(opts.apiVersion || apiVersion())}`;
    const r = assertAllowed(method, url);
    const headers = { 'api-key': keyFor(r.key) };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const t0 = performance.now();
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    const ms = performance.now() - t0;
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = { _raw: text }; }

    const entry = {
      at: new Date().toISOString(), label: opts.label || r.what, method,
      url: url.replace(/api-key=[^&]+/i, 'api-key=[redacted]'),
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'api-key': '[redacted]' },
      body: body === undefined ? undefined : redact(body),
      status: res.status, ms: Math.round(ms),
    };
    state.requests.push(entry);
    if (state.requests.length > 200) state.requests.shift();
    renderRequests();

    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      const err = new Error(`${r.what}: ${msg}`); err.status = res.status; err.data = data; throw err;
    }
    return { data, ms, status: res.status };
  }

  const idx = i => encodeURIComponent(i || indexName());

  async function search(body, opts = {}) {
    const out = await call('POST', `/indexes/${idx(opts.index)}/docs/search`, body, opts);
    const d = out.data || {};
    return {
      ms: out.ms,
      count: d['@odata.count'],
      docs: d.value || [],
      raw: d,
    };
  }

  async function analyze(text, analyzer, opts = {}) {
    const out = await call('POST', `/indexes/${idx(opts.index)}/analyze`, { text, analyzer }, opts);
    return (out.data && out.data.tokens) || [];
  }

  async function getIndex(name, opts = {}) { return (await call('GET', `/indexes/${idx(name)}`, undefined, opts)).data; }

  async function listIndexes(opts = {}) {
    const out = await call('GET', '/indexes?$select=name', undefined, opts);
    return ((out.data && out.data.value) || []).map(i => i.name);
  }

  /* ----------------------------------------------------------- UI shell */

  function banner(kind, html) {
    const b = $('lc-banner'); if (!b) { console[kind === 'err' ? 'error' : 'log'](html); return; }
    b.className = `banner show ${kind}`; b.innerHTML = html;
  }
  function clearBanner() { const b = $('lc-banner'); if (b) b.className = 'banner'; }

  const PILL = {
    prod: ['err', 'from production'],
    proposal: ['acc', 'proposal'],
    lab: ['warn', 'lab decision'],
    measured: ['ok', 'measured'],
    assumption: ['neutral', 'assumption'],
  };
  function pill(kind, text) {
    const [cls, def] = PILL[kind] || [kind, kind];
    return `<span class="pill ${cls}" data-prov="${esc(kind)}">${esc(text || def)}</span>`;
  }

  function tabs(root = document) {
    root.querySelectorAll('.tab[data-pane]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.tab[data-pane]').forEach(b => b.classList.toggle('active', b === btn));
        root.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === btn.dataset.pane));
      });
    });
  }

  function renderRequests() {
    const box = $('lc-requests'); if (!box) return;
    if (!state.requests.length) { box.innerHTML = '<div class="empty">No requests yet.</div>'; return; }
    box.innerHTML = state.requests.slice().reverse().map(r => `
      <details class="req"><summary><span class="pill ${r.status < 400 ? 'ok' : 'err'}">${r.status}</span>
        <b>${esc(r.label)}</b> <span class="mono">${esc(r.method)} ${esc(new URL(r.url).pathname)}</span>
        <span class="muted">${r.ms} ms · ${esc(r.at)}</span></summary>
        <pre class="code">${esc(JSON.stringify({ method: r.method, url: r.url, headers: r.headers, body: r.body }, null, 2))}</pre>
      </details>`).join('');
  }

  function toggleShotMode() { document.body.classList.toggle('shot'); }

  function envBadge() {
    const e = $('lc-env'); if (!e) return;
    const r = resource();
    if (!r) { e.textContent = ''; return; }
    e.className = `env ${isProd(r) ? 'prod' : 'nonprod'}`;
    e.textContent = isProd(r) ? 'PROD · read-only' : `${r.label} · read-only`;
  }

  function fillIndexes(names, preferred) {
    const el = $('lc-index'); if (!el) return;
    const current = el.value;
    if (el.tagName === 'SELECT') {
      el.innerHTML = names.map(n => `<option>${esc(n)}</option>`).join('');
      const pick = [current, preferred, global.SEARCH_DEFAULT_INDEX].find(n => n && names.includes(n));
      if (pick) el.value = pick;
    } else {
      const dl = $('lc-index-list'); if (dl) dl.innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
      if (!el.value) el.value = preferred || names[0] || '';
    }
  }

  async function onResourceChange(preferredIndex) {
    envBadge();
    const r = resource(); if (!r) return;
    let names = Array.isArray(r.indexes) ? r.indexes.slice() : [];
    if (r.adminKey) {
      try { names = await listIndexes(); } catch { /* fall back to the configured list */ }
    }
    fillIndexes(names, preferredIndex);
    if (state.onIndexChange) state.onIndexChange(indexName());
  }

  /**
   * init({ defaultResource, defaultIndex, apiVersion, onIndexChange })
   *   defaultResource: label to pre-select (e.g. 'Prod'); matched case-insensitively.
   */
  async function init(opts = {}) {
    state.onIndexChange = opts.onIndexChange || null;
    const list = resources();
    const sel = $('lc-resource');
    const av = $('lc-apiversion');
    if (av && !av.value) av.value = opts.apiVersion || global.SEARCH_API_VERSION || DEFAULT_API_VERSION;
    tabs();
    renderRequests();
    if (!list.length) {
      if (sel) sel.innerHTML = '<option>test-search.config.js not loaded</option>';
      banner('err', 'No <code>window.SEARCH_RESOURCES</code>. Open this lab from the folder that holds ' +
        '<code>test-search.config.js</code> (see the search-lab skill).');
      return false;
    }
    if (sel) {
      sel.innerHTML = list.map(r => `<option>${esc(r.label)}</option>`).join('');
      const want = String(opts.defaultResource || '').toLowerCase();
      const i = list.findIndex(r => String(r.label).toLowerCase() === want);
      if (i >= 0) sel.selectedIndex = i;
      sel.addEventListener('change', () => onResourceChange(opts.defaultIndex));
    }
    const ix = $('lc-index');
    if (ix) ix.addEventListener('change', () => state.onIndexChange && state.onIndexChange(indexName()));
    await onResourceChange(opts.defaultIndex);
    return true;
  }

  /* ------------------------------------------------------ analysis helpers */

  // Optimal string alignment distance: Levenshtein plus adjacent transposition,
  // which is how Azure AI Search fuzzy (~n) counts edits (Damerau-Levenshtein).
  function editDistance(a, b) {
    a = String(a).toLowerCase(); b = String(b).toLowerCase();
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[m][n];
  }

  function overlapAtK(aIds, bIds, K) {
    const a = aIds.slice(0, K), b = bIds.slice(0, K);
    const setB = new Set(b);
    const inter = a.filter(id => setB.has(id));
    return {
      K, inter: inter.length,
      ratio: Math.max(a.length, b.length) ? inter.length / Math.max(a.length, b.length) : 1,
      onlyA: a.filter(id => !setB.has(id)),
      onlyB: b.filter(id => !new Set(a).has(id)),
      top1Same: a[0] !== undefined && a[0] === b[0],
    };
  }

  // Lucene special characters in queryType=full: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
  function luceneEscape(t) { return String(t).replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1'); }

  // Exact term on every searchField, fuzzy only on `fields` (scope the operator,
  // not the field list — gotcha G12). Multi-token input is ANDed per token.
  function scopedFuzzy(text, fields, distance = 1) {
    const toks = String(text || '').trim().split(/\s+/).filter(Boolean).map(luceneEscape);
    return toks.map(t => {
      const fz = (fields || []).map(f => `${f}:${t}~${distance}`).join(' OR ');
      return fz ? `((${t}) OR (${fz}))` : `(${t})`;
    }).join(' AND ');
  }

  // Highlights come back as fragments with pre/post tags; returns the marked surface forms.
  function extractMarks(fragment, pre = '<em>', post = '</em>') {
    const out = []; let i = 0;
    while ((i = fragment.indexOf(pre, i)) >= 0) {
      const j = fragment.indexOf(post, i + pre.length);
      if (j < 0) break;
      out.push(fragment.slice(i + pre.length, j)); i = j + post.length;
    }
    return out;
  }

  /* ------------------------------------------------------ evidence helpers */

  // The GET URL production would fire for the same body (key never included).
  function parityGetUrl(body, opts = {}) {
    const map = { filter: '$filter', select: '$select', orderby: '$orderby', top: '$top', skip: '$skip', count: '$count' };
    const p = new URLSearchParams();
    p.set('api-version', opts.apiVersion || apiVersion());
    for (const [k, v] of Object.entries(body || {})) {
      if (v === undefined || v === null || k === 'vectorQueries') continue;
      const name = map[k] || k;
      if (Array.isArray(v)) v.forEach(x => p.append(name, String(x)));
      else p.set(name, String(v));
    }
    return `${opts.endpoint || endpoint()}/indexes/${idx(opts.index)}/docs?${p.toString()}`;
  }

  function meta(extra = {}) {
    const r = resource();
    return {
      lab: state.labName, labCoreVersion: VERSION, generatedAt: new Date().toISOString(),
      resource: r ? r.label : null, host: endpoint() ? new URL(endpoint()).host : null,
      index: indexName(), apiVersion: apiVersion(), ...extra,
    };
  }

  function download(filename, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportJson(prefix, payload) {
    const doc = { meta: meta(), ...payload, requests: state.requests };
    download(`${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(doc, null, 2));
    return doc;
  }

  function markdownTable(headers, rows) {
    const cell = v => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    return [
      `| ${headers.map(cell).join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map(r => `| ${r.map(cell).join(' | ')} |`),
    ].join('\n');
  }

  async function copyMarkdown(headers, rows) {
    const md = markdownTable(headers, rows);
    try { await navigator.clipboard.writeText(md); banner('ok', 'Markdown table copied to the clipboard.'); }
    catch { banner('warn', 'Clipboard unavailable — table printed to the console.'); console.log(md); }
    return md;
  }

  global.LabCore = {
    VERSION, $, esc, state,
    resources, resource, endpoint, apiVersion, indexName, isProd,
    ALLOWED, assertAllowed, call, search, analyze, getIndex, listIndexes, redact,
    init, banner, clearBanner, pill, tabs, renderRequests, toggleShotMode,
    editDistance, overlapAtK, extractMarks, luceneEscape, scopedFuzzy,
    parityGetUrl, meta, exportJson, markdownTable, copyMarkdown, download,
  };
})(window);
