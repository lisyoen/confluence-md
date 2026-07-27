'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { convertConfluenceHtml } = require('../src/converter');

const projectDir = path.join(__dirname, '..');
fs.mkdirSync(path.join(projectDir, 'work-samples'), { recursive: true });
[
  ['sample-confluence.html', 'sample-confluence.md']
].forEach(([input, output]) => {
  const html = fs.readFileSync(path.join(projectDir, 'tests', 'fixtures', input), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://confluence.score/pages/viewpage.action'
  });
  const mainContent = dom.window.document.querySelector('#main-content');
  if (!mainContent) throw new Error(`#main-content not found in ${input}`);
  fs.writeFileSync(
    path.join(projectDir, 'work-samples', output),
    convertConfluenceHtml(mainContent, { document: dom.window.document })
  );
  dom.window.close();
  console.log(`Generated work-samples/${output}`);
});
process.exit(0);
