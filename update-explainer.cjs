#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PAGE = path.join(ROOT, 'search-lab-explained.html');
const FILES = [
  '.github/agents/azure-ai-search-engineer.agent.md',
  ...['diagnose-indexer', 'analyze-query', 'benchmark-relevance', 'review-capacity', 'build-search-lab', 'azure-search-documents-py'].map(name => `.github/skills/${name}/SKILL.md`),
  '.github/prompts/save-search-case.prompt.md',
  '.github/prompts/retro.prompt.md',
];
const KEY_LIKE = /[A-Za-z0-9]{30,}AzSe[A-Za-z0-9]{4,}|(api-?key|adminKey|apiKey)["']?\s*[:=]\s*["'][A-Za-z0-9]{40,}["']/i;

function metadata(file) {
  const text = fs.readFileSync(path.join(ROOT, ...file.split('/')), 'utf8');
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!header) throw new Error(`Missing frontmatter: ${file}`);
  const name = header[1].match(/^name: ([a-z0-9-]+)$/m)?.[1];
  const description = header[1].match(/^description: "([^"\r\n]+)"$/m)?.[1]
    || header[1].match(/^description: \|\r?\n((?:[ \t]+[^\r\n]+\r?\n?)+)/m)?.[1].trim().split(/\r?\n/).map(line => line.trim()).join(' ');
  if (!name || !description) throw new Error(`Unsupported name/description metadata: ${file}`);
  if (KEY_LIKE.test(description)) throw new Error(`Refusing credential-like metadata: ${file}`);
  const source = { path: file, name, description };
  if (file.endsWith('.agent.md')) {
    const toolList = header[1].match(/^tools: (\[[^\r\n]+\])$/m)?.[1];
    if (!toolList || !/^\['[a-z/*-]+'(?:, '[a-z/*-]+')*\]$/.test(toolList)) {
      throw new Error(`Unsupported tool metadata: ${file}`);
    }
    source.tools = JSON.parse(toolList.replace(/'/g, '"'));
  }
  return source;
}

// Embed discovery metadata only. Source documents and code remain in their files.
const sources = FILES.map(metadata);
const json = JSON.stringify(sources).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, character => character === '\u2028' ? '\\u2028' : '\\u2029');
const block = `/*SKILL_FILES:BEGIN*/const SOURCES = ${json};/*SKILL_FILES:END*/`;
const html = fs.readFileSync(PAGE, 'utf8');
const markers = /\/\*SKILL_FILES:BEGIN\*\/[\s\S]*?\/\*SKILL_FILES:END\*\//;
if (!markers.test(html)) throw new Error('Metadata markers missing in search-lab-explained.html.');
fs.writeFileSync(PAGE, html.replace(markers, () => block));
console.log(`Updated compact guide metadata for ${sources.length} sources.`);
