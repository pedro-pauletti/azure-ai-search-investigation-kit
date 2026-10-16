'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, '_site');
const sourceBase = 'https://github.com/pedro-pauletti/azure-ai-search-investigation-kit/blob/main/';
const assets = ['azure-ai-search.svg', 'github-mark.svg', 'microsoft-logo.png', 'copilot-example.css'];
const html = fs.readFileSync(path.join(root, 'search-lab-explained.html'), 'utf8')
  .replace('</head>', `<meta name="source-base" content="${sourceBase}" />\n</head>`)
  .replace(/href="(\.github\/[^"]+|README\.md(?:#[^"]*)?)"/g, (_, file) => `href="${sourceBase}${file}"`);
fs.mkdirSync(path.join(output, 'presentation-assets'), { recursive: true });
for (const name of ['index.html', 'search-lab-explained.html']) {
  fs.writeFileSync(path.join(output, name), html);
}
for (const name of assets) {
  fs.copyFileSync(path.join(root, 'presentation-assets', name), path.join(output, 'presentation-assets', name));
}
console.log('Built Pages presentation in _site; source links point to the repository.');
