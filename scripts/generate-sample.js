'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { convertConfluenceHtml } = require('../src/converter');

const projectDir = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(projectDir, 'samples', 'Confluence.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://confluence.score/pages/viewpage.action?pageId=362457980' });
const mainContent = dom.window.document.querySelector('#main-content');
if (!mainContent) throw new Error('#main-content not found');

fs.mkdirSync(path.join(projectDir, 'work-samples'), { recursive: true });
fs.writeFileSync(
  path.join(projectDir, 'work-samples', 'Confluence.md'),
  convertConfluenceHtml(mainContent, { document: dom.window.document })
);
dom.window.close();
console.log('Generated work-samples/Confluence.md');
process.exit(0);
