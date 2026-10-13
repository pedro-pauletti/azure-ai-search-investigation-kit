'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const relative = file => path.join(ROOT, ...file.split('/'));
const read = file => fs.readFileSync(relative(file), 'utf8');
const workflows = ['diagnose-indexer', 'analyze-query', 'benchmark-relevance', 'review-capacity'];
const skills = [...workflows, 'build-search-lab', 'azure-search-documents-py'];
const pagePath = relative('search-lab-explained.html');

test('public starter excludes runtime credentials and keeps placeholder configuration publishable', () => {
  for (const file of ['.env', 'test-search.config.js', '.vscode']) {
    assert.equal(fs.existsSync(relative(file)), false, `Excluded artifact: ${file}`);
  }
  assert.ok(fs.existsSync(relative('LICENSE')));
  assert.ok(fs.existsSync(relative('.github/skills/azure-search-documents-py/LICENSE')));
  assert.equal(fs.existsSync(relative('lab-kit/node_modules/.env')), false);
  const ignored = ['.env', '.env.local', 'test-search.config.js', '.vscode/settings.json', 'local-cases/case/results/a.json'];
  const result = execFileSync('git', ['check-ignore', '--no-index', ...ignored], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/);
  assert.deepEqual(result, ignored);
  const safe = spawnSync('git', ['check-ignore', '--no-index', '.env.example', 'test-search.config.example.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(safe.status, 1);
  assert.equal(safe.stdout, '');
});

test('retained npm commands point to existing scripts and the guide has no removed evaluation dependencies', () => {
  const commands = JSON.parse(read('package.json')).scripts;
  assert.deepEqual(Object.keys(commands).sort(), ['build:pages', 'score:relevance', 'test', 'update-guide']);
  for (const command of Object.values(commands)) {
    assert.match(command, /^node /);
    for (const file of command.split(/\s+/).slice(1).filter(argument => !argument.startsWith('--'))) {
      assert.ok(fs.existsSync(relative(file)), `Missing npm entrypoint: ${file}`);
    }
  }
  assert.doesNotMatch(read('search-lab-explained.html'), /(?:evaluations|examples|validation)[\\/]/);
});

async function launchTestBrowser() {
  const { chromium } = require('playwright-core');
  const failures = [];
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch({ ...(channel ? { channel } : {}), headless: true });
    } catch (error) {
      failures.push(`${channel || 'chromium'}: ${error.message}`);
    }
  }
  throw new Error(`Install Edge, Chrome or Chromium to run UI tests.\n${failures.join('\n')}`);
}

test('Pages build includes only the presentation and public assets with valid hosted source links', () => {
  execFileSync(process.execPath, [relative('build-pages.cjs')], { cwd: ROOT });
  const html = read('_site/index.html');
  assert.equal(html, read('_site/search-lab-explained.html'));
  assert.match(html, /name="source-base" content="https:\/\/github\.com\/pedro-pauletti\/azure-ai-search-investigation-kit\/blob\/main\/"/);
  assert.doesNotMatch(html, /href="\.github\//);
  assert.match(html, /href="https:\/\/github\.com\/pedro-pauletti\/azure-ai-search-investigation-kit\/blob\/main\/\.github\/README.md"/);
  assert.deepEqual(fs.readdirSync(relative('_site')).sort(), ['index.html', 'presentation-assets', 'search-lab-explained.html']);
  assert.deepEqual(fs.readdirSync(relative('_site/presentation-assets')).sort(), ['azure-ai-search.svg', 'copilot-example.css', 'github-mark.svg', 'microsoft-logo.png']);
  for (const match of html.matchAll(/(?:src|href)="(presentation-assets\/[^"]+)"/g)) {
    assert.ok(fs.existsSync(relative(`_site/${match[1]}`)));
  }
});

test('one agent, discoverable skills and focused prompts have valid required metadata', () => {
  const agents = fs.readdirSync(relative('.github/agents')).filter(file => file.endsWith('.agent.md'));
  assert.deepEqual(agents, ['azure-ai-search-engineer.agent.md']);
  for (const name of skills) {
    const text = read(`.github/skills/${name}/SKILL.md`);
    const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(header, `${name}: missing frontmatter`);
    assert.match(header[1], new RegExp(`^name: ${name}$`, 'm'));
    assert.match(header[1], /^description:\s*(?:"[^"]+"|\|)$/m);
  }
  const agent = read('.github/agents/azure-ai-search-engineer.agent.md');
  for (const tool of ['azure/search', 'azure/monitor', 'azure/kusto', 'azure/resourcehealth', 'microsoft-docs/*']) assert.ok(agent.includes(`'${tool}'`), `Missing tool ${tool}`);
  assert.match(agent, /^agents: \[\]$/m);
  for (const command of ['save-search-case', 'retro']) {
    const text = read(`.github/prompts/${command}.prompt.md`);
    assert.match(text, /^agent: azure-ai-search-engineer$/m);
    assert.match(text, /^description: ".+"$/m);
  }
});

test('local methodology links resolve, excluding case-template placeholders', () => {
  const folders = [relative('.github/agents'), relative('.github/prompts')];
  for (const skill of skills) folders.push(relative(`.github/skills/${skill}`));
  const files = [
    relative('README.md'), relative('CASE-CATALOG.md'), relative('THIRD-PARTY-NOTICES.md'),
    relative('.github/README.md'), relative('.github/azure-ai-search-method.md'), relative('.github/copilot-instructions.md'),
  ];
  function collect(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name);
      if (entry.isDirectory()) collect(target);
      else if (entry.name.endsWith('.md')) files.push(target);
    }
  }
  folders.forEach(collect);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^[a-z]+:/i.test(link)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), ...link.split('/'))), `Broken link in ${path.relative(ROOT, file)}: ${link}`);
    }
  }
});

test('runtime copies match canonical assets and original validation entrypoint still works', () => {
  for (const asset of ['lab-core.js', 'lab-core.css']) assert.equal(read(`lab-kit/${asset}`), read(`.github/skills/build-search-lab/assets/lab-kit/${asset}`));
  const legacy = execFileSync(process.execPath, [relative('.github/skills/search-lab/scripts/validate-lab.cjs'), relative('.github/skills/build-search-lab/assets/lab-template.html'), '--no-smoke', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(JSON.parse(legacy).errors, 0);
});

test('compact guide embeds current discovery metadata, not source bodies, and stays within its size budget', () => {
  const html = fs.readFileSync(pagePath, 'utf8');
  const block = html.match(/\/\*SKILL_FILES:BEGIN\*\/([\s\S]*?)\/\*SKILL_FILES:END\*\//);
  assert.ok(block);
  const context = vm.createContext({});
  vm.runInContext(block[1] + '\nthis.sources = SOURCES;', context);
  assert.equal(context.sources.length, skills.length + 3);
  for (const source of context.sources) {
    const header = read(source.path).match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    assert.match(header, new RegExp(`^name: ${source.name}$`, 'm'));
    assert.ok(header.replace(/\s+/g, ' ').includes(source.description), `Stale metadata: ${source.path}`);
    if (source.name === 'azure-ai-search-engineer') {
      assert.deepEqual(Object.keys(source).sort(), ['description', 'name', 'path', 'tools']);
      const tools = header.match(/^tools: (\[[^\r\n]+\])$/m)[1];
      assert.equal(JSON.stringify(source.tools), JSON.stringify(JSON.parse(tools.replace(/'/g, '"'))));
    } else {
      assert.deepEqual(Object.keys(source).sort(), ['description', 'name', 'path']);
    }
  }
  assert.ok(Buffer.byteLength(html, 'utf8') < 48000, 'Guide markup must remain below 48 KB; keep example styling in local assets and do not re-embed source documents.');
  const stylesheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(stylesheets, ['presentation-assets/copilot-example.css']);
  assert.ok(fs.existsSync(relative(stylesheets[0])));
  assert.doesNotMatch(read(stylesheets[0]), /@import|url\(\s*['"]?https?:/i);
  assert.doesNotMatch(html, /const FILES =|SKILL.md":"---|test-search\.config\.js/);
  assert.doesNotMatch(html, /search-investigator|search-lab-builder|search-lab-reviewer|searchFieldsGroup|SoftBoostProfile/i);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:/i);
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(script[1]);
});

test('generic lab uses configured document key for overlap and export and surfaces missing keys', { timeout: 30000 }, async () => {
  const browser = await launchTestBrowser();
  const fixture = relative('methodology-key-fixture-lab.html');
  const html = read('.github/skills/build-search-lab/assets/lab-template.html').replace("keyField: 'id'", "keyField: 'documentKey'");
  fs.writeFileSync(fixture, html, { flag: 'wx' });
  try {
    const context = await browser.newContext();
    const errors = [];
    let missing = false;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'file:') {
        if (url.pathname.endsWith('/test-search.config.js')) return route.fulfill({ contentType: 'application/javascript', body: 'window.SEARCH_RESOURCES=[{label:"Stub",endpoint:"https://lab-smoke.search.windows.net",apiKey:"stub",indexes:["fixture"]}];window.SEARCH_DEFAULT_INDEX="fixture";' });
        return route.continue();
      }
      if (url.hostname !== 'lab-smoke.search.windows.net') return route.abort();
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const body = url.pathname === '/indexes' ? { value: [{ name: 'fixture' }] } : {
        '@odata.count': 1,
        value: [missing ? { title: 'Sample' } : { documentKey: 'doc-A', title: 'Sample', '@search.score': 1 }],
      };
      return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(fixture).href);
    await page.evaluate(() => runAll());
    assert.equal(await page.evaluate(() => RUNS[0].ov.top1Same), true);
    const exported = await page.evaluate(() => {
      let captured;
      LabCore.exportJson = (_name, data) => { captured = data; };
      exportRun();
      return captured.runs[0].A.top[0].id;
    });
    assert.equal(exported, 'doc-A');
    missing = true;
    await page.evaluate(() => runAll());
    assert.match(await page.locator('#lc-banner').innerText(), /missing the configured document key/);
    assert.deepEqual(errors, []);
  } finally {
    fs.unlinkSync(fixture);
    await browser.close();
  }
});

test('capability map shows the agent, configured tools, access boundaries and usage without remote calls', { timeout: 60000 }, async () => {
  const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext();
    const remote = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).protocol === 'file:') return route.continue();
      remote.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(pagePath).href);
    assert.equal(await page.locator('#agent-view').isVisible(), true);
    assert.equal(await page.locator('#case-view').isVisible(), false);
    assert.equal((await page.locator('.masthead').textContent()).replace(/\s+/g, ' ').trim(), 'Azure AI Search & GitHub Copilot / Field Guide');
    assert.equal(await page.locator('.masthead img').count(), 2);
    assert.equal(await page.locator('main img').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), /Offline demo · no Azure calls/);
    assert.equal(await page.locator('.engineer-icon use').getAttribute('href'), '#i-robot');
    for (const name of ['Azure AI Search', 'GitHub', 'Microsoft']) {
      const image = page.getByRole('img', { name, exact: true });
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(alt => {
        const image = [...document.images].find(item => item.alt === alt);
        return image?.complete && image.naturalWidth > 0;
      }, name);
      assert.equal(await image.evaluate(element => element.width > 0 && element.height > 0), true);
      assert.ok(fs.existsSync(relative(await image.getAttribute('src'))));
    }
    assert.equal(await page.locator('svg.icon:not([aria-hidden="true"])').count(), 0);
    assert.match(await page.locator('footer').innerText(), /Not affiliated with or endorsed by Microsoft/);
    for (const use of await page.locator('svg.icon use').evaluateAll(elements => elements.map(element => element.getAttribute('href')))) {
      assert.equal(await page.locator(use).count(), 1, `Missing icon symbol: ${use}`);
    }
    assert.match(await page.locator('.engineer-node').innerText(), /Azure AI Search/);
    assert.match(await page.locator('.usage').innerText(), /agent picker/);
    assert.match(await page.locator('.usage').innerText(), /API version/);
    assert.match(await page.locator('.access-note').innerText(), /not a live access check/);
    for (const [capability, expectation] of [
      ['azure', /azure\/search[\s\S]*azure\/monitor[\s\S]*azure\/kusto[\s\S]*azure\/resourcehealth/],
      ['learn', /microsoft-docs\/\*/],
      ['skills', /diagnose-indexer[\s\S]*azure-search-documents-py/],
      ['workspace', /read[\s\S]*edit[\s\S]*execute/],
    ]) {
      await page.locator(`[data-capability="${capability}"]`).focus();
      await page.keyboard.press('Enter');
      assert.match(await page.locator('#access-detail').innerText(), expectation);
      assert.equal(await page.locator(`[data-capability="${capability}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.reload();
    assert.equal(await page.locator('[data-capability="workspace"]').getAttribute('aria-pressed'), 'true');
    for (const width of [1500, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Map overflow at ${width}px`);
      if (width === 1500) assert.ok(await page.evaluate(() => document.body.scrollHeight < innerHeight), 'Default agent view should fit in one screen.');
    }
    await page.locator('#get-prompt').click();
    assert.equal(await page.locator('#starter').evaluate(element => element.open), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'starter-prompt');
    await page.locator('#choose-workflow').click();
    assert.equal(await page.locator('#case-view').isVisible(), true);
    assert.equal(await page.locator('#agent-view').isVisible(), false);
    assert.match(await page.locator(':focus').getAttribute('data-workflow'), /analyze-query/);
    await page.locator('#agent-view-button').click();
    assert.equal(await page.locator('#agent-view').isVisible(), true);
    assert.equal(new URL(page.url()).searchParams.get('view'), 'agent');
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
  } finally {
    await browser.close();
  }
});

test('guided scenarios, larger chat, template-shaped lab and prompt copy work offline and remain responsive', { timeout: 60000 }, async () => {
  const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext();
    const remote = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).protocol === 'file:') return route.continue();
      remote.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(pagePath).href + '?view=case&step=3&workflow=review-capacity');
    await page.setViewportSize({ width: 1500, height: 950 });
    assert.ok(await page.locator('#example').evaluate(element => element.getBoundingClientRect().height >= 420), 'Desktop chat must be larger than the original preview.');
    assert.ok(await page.locator('#example').evaluate(element => element.getBoundingClientRect().width >= 550), 'Desktop chat must have room for the generated lab layout.');
    assert.equal(await page.locator('#skill-link').innerText(), 'review-capacity');
    assert.match(await page.locator('#step-title').innerText(), /wait for approval/);
    assert.match(await page.locator('#example').innerText(), /No calls/);
    assert.equal(await page.locator('#toolbox').getAttribute('open'), null);
    assert.equal(await page.locator('#starter').getAttribute('open'), null);
    for (const workflow of workflows) {
      await page.locator(`[data-workflow="${workflow}"]`).click();
      assert.equal(await page.locator(`[data-workflow="${workflow}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#skill-link').innerText(), workflow);
      assert.match(await page.locator('#starter-prompt').inputValue(), new RegExp(workflow));
      assert.match(await page.locator('#progress').innerText(), /Step 1 of 5/);
      assert.match(await page.locator('.chat-header').innerText(), /GitHub Copilot[\s\S]*Illustrative example/);
      assert.equal(await page.locator('.chat-message.user .chat-author').innerText(), 'You');
      assert.equal(await page.locator('.chat-message.copilot .chat-author').innerText(), 'GitHub Copilot');
      assert.match(await page.locator('.chat-skill').innerText(), new RegExp(workflow));
      assert.equal(await page.locator(`[data-workflow="${workflow}"] svg.icon use`).count(), 1);
      assert.match(await page.locator('.chat-agent').innerText(), /azure-ai-search-engineer/);
      assert.equal(await page.locator('.chat-send').isDisabled(), true);
      assert.equal(await page.locator('.chat-thread').getAttribute('tabindex'), '0');
      await page.locator('#chat-theme').click();
      const theme = await page.locator('#example').getAttribute('data-theme');
      assert.ok(['light', 'dark'].includes(theme));
      assert.equal(new URL(page.url()).searchParams.get('chatTheme'), theme);
      assert.equal(await page.locator('#example').evaluate(element => getComputedStyle(element).backgroundColor), theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(31, 31, 31)');
      await page.locator('#next').click();
      assert.equal(await page.locator('#next').isDisabled(), true);
      await page.locator('#approve-demo').focus();
      await page.keyboard.press('Enter');
      assert.match(await page.locator('#example').innerText(), /Demo plan approved/);
      await page.locator('#next').click();
      assert.doesNotMatch(await page.locator('#step-title').innerText(), /wait for approval/);
      await page.locator('.chat-tool summary').click();
      assert.match(await page.locator('.chat-tool-body').innerText(), /Nothing was executed/);
      assert.match(await page.locator('#example').innerText(), /Mock output — synthetic, not measured/);
      assert.ok(JSON.parse(await page.locator('.mock-output').innerText()));
      assert.equal(await page.locator('.chat-tool').evaluate(element => element.open), true);
      await page.locator('#next').click();
      assert.match(await page.locator('#step-badge').innerText(), /Optional/);
      if (['diagnose-indexer', 'review-capacity'].includes(workflow)) assert.match(await page.locator('#example').innerText(), /saved/i);
      assert.equal(await page.locator('#lab-preview').evaluate(element => element.open), false);
      await page.locator('#lab-preview summary').click();
      assert.match(await page.locator('.mini-lab').innerText(), /Synthetic illustration/);
      assert.equal(await page.locator('.mini-grid > div').count(), 2);
      assert.match(await page.locator('.mini-config').innerText(), /Service[\s\S]*Index[\s\S]*api-version/);
      assert.match(await page.locator('.mini-sidebar').innerText(), /What this lab does not prove/);
      assert.match(await page.locator('.mini-note').innerText(), /Controls are disabled; no calls or downloads/);
      assert.ok(await page.locator('#example').evaluate(element => element.getBoundingClientRect().height >= 620), 'Expanded lab preview needs a larger chat window.');
      assert.equal(await page.locator('.mini-controls button:not(:disabled)').count(), 0);
      if (['analyze-query', 'benchmark-relevance'].includes(workflow)) {
        assert.match(await page.locator('.mini-lab').innerText(), /A · Today[\s\S]*B · Proposal/);
        assert.match(await page.locator('.mini-tabs').innerText(), /Side by side[\s\S]*Matrix[\s\S]*Why it matched[\s\S]*Analyzer[\s\S]*Requests \/ parity/);
        assert.match(await page.locator('.mini-sidebar').innerText(), /"searchFields"/);
        assert.equal(await page.getByRole('button', { name: 'Run comparison', exact: true }).isDisabled(), true);
      } else {
        assert.match(await page.locator('.mini-sidebar').innerText(), /Saved evidence only/);
        assert.equal(await page.getByRole('button', { name: 'Run comparison', exact: true }).count(), 0);
      }
      for (const width of [1500, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 950 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Open lab overflow at ${width}px`);
        assert.equal(await page.locator('.mini-lab').evaluate(element => element.scrollWidth > element.clientWidth), false, `Lab content overflow at ${width}px`);
      }
      await page.setViewportSize({ width: 1500, height: 950 });
      await page.locator('#chat-theme').click();
      assert.equal(await page.locator('#lab-preview').evaluate(element => element.open), true);
      await page.locator('#skip-lab').click();
      assert.match(await page.locator('#step-description').innerText(), /\/save-search-case/);
      assert.match(await page.locator('#step-description').innerText(), /\/retro/);
      assert.match(await page.locator('#example').innerText(), /CASE-CATALOG/);
      await page.locator('#next').click();
      assert.match(await page.locator('#progress').innerText(), /Step 1 of 5/);
      await page.locator('[data-step="3"]').click();
      assert.match(await page.locator('#step-title').innerText(), /wait for approval/);
      await page.locator('#return-plan').click();
      assert.equal(await page.locator('#next').isDisabled(), true);
    }
    await page.locator('#back').click();
    await page.locator('#toolbox summary').click();
    assert.match(await page.locator('#toolbox').innerText(), /Microsoft Python skill/);
    const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    for (const link of links) if (!link.startsWith('#')) assert.ok(fs.existsSync(relative(link)), `Missing linked source: ${link}`);
    await page.locator('#starter summary').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('starter') === 'open');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedPrompt = text; } }, configurable: true });
    });
    await page.locator('#copy-prompt').click();
    assert.equal(await page.evaluate(() => window.copiedPrompt), await page.locator('#starter-prompt').inputValue());
    assert.match(await page.locator('#copy-status').innerText(), /copied/);
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
    await page.locator('#copy-prompt').click();
    assert.match(await page.locator('#copy-status').innerText(), /copy it manually/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'starter-prompt');
    await page.reload();
    assert.equal(await page.locator('#example').getAttribute('data-theme'), new URL(page.url()).searchParams.get('chatTheme'));
    assert.equal(await page.locator('#starter').evaluate(element => element.open), true);
    assert.equal(await page.locator('#toolbox').evaluate(element => element.open), true);
    await page.locator('#starter summary').click();
    await page.locator('#toolbox summary').click();
    assert.ok((await page.locator('body').innerText()).split(/\s+/).length < 450, 'Default visible copy must remain concise.');
    for (const width of [1500, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
      if (width === 1500) {
        assert.ok(await page.locator('#example').evaluate(element => element.getBoundingClientRect().height >= 420), 'The walkthrough prioritizes a larger readable chat over fitting in one screen.');
      } else if (width <= 700) {
        assert.ok(await page.locator('#example').evaluate(element => element.getBoundingClientRect().height >= 480), 'Mobile chat must retain the larger readable window.');
      }
    }
    await page.goto(pathToFileURL(pagePath).href + '?view=case&workflow=unknown&step=99');
    assert.equal(await page.locator('#skill-link').innerText(), 'analyze-query');
    assert.match(await page.locator('#progress').innerText(), /Step 1 of 5/);
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
  } finally {
    await browser.close();
  }
});
