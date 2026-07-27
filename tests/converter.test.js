'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const {
  convertConfluenceHtml,
  extractTitle,
  sanitizeFilename
} = require('../src/converter');

const samplePath = path.join(__dirname, 'fixtures', 'sample-confluence.html');
const html = fs.readFileSync(samplePath, 'utf8');
const dom = new JSDOM(html, { url: 'https://confluence.score/pages/viewpage.action' });
const mainContent = dom.window.document.querySelector('#main-content');
assert(mainContent, '#main-content should exist in sample');

const markdown = convertConfluenceHtml(mainContent, { document: dom.window.document });
const checks = [
  ['heading', () => assert.match(markdown, /^# 개요$/m)],
  ['GFM table', () => {
    assert.match(markdown, /^\|.+\|$/m);
    assert.match(markdown, /^\|(?:\s*:?-{3,}:?\s*\|)+$/m);
  }],
  ['fenced code block', () => assert.match(markdown, /```(?:js|javascript|bash)?\n[\s\S]+?```/)],
  ['task list', () => assert.match(markdown, /^- \[[ x]\] .+$/m)],
  ['no image references', () => {
    assert.doesNotMatch(markdown, /<img|data:image|\.png\)/i);
  }],
  ['status macro', () => assert.match(markdown, /\[상태\]/)],
  ['expand content', () => {
    assert.match(markdown, /펼치기 안의 내용/);
    assert.match(markdown, /닫혀진 확장/);
  }],
  ['absolute Confluence link', () => {
    const linkDom = new JSDOM('<main><a href="/display/TEST/Page">페이지</a></main>', {
      url: 'https://confluence.score/pages/viewpage.action'
    });
    const linkMarkdown = convertConfluenceHtml(
      linkDom.window.document.querySelector('main'),
      { document: linkDom.window.document }
    );
    assert.match(linkMarkdown, /\]\(https:\/\/confluence\.score\/display\/TEST\/Page\)/);
    linkDom.window.close();
  }],
  ['JavaScript code cleanup', () => {
    assert.match(markdown, /```js\nlet test = 'test'\n```/);
  }],
  ['Bash code cleanup', () => {
    assert.match(markdown, /```bash\nls -la\n```/);
  }],
  ['no code UI artifacts', () => {
    assert.doesNotMatch(markdown, /expand source/);
    assert.doesNotMatch(markdown, /원본 펼치기/);
    assert.doesNotMatch(markdown, /^\?$/m);
  }],
  ['nested task list', () => {
    assert.match(markdown, /\n- \[ \] 작업목록2\n    - \[ \] 작업목록 들여쓰기\n/);
  }],
  ['no source footer', () => {
    assert.doesNotMatch(markdown, /\[Confluence 원문\]/);
  }]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} checks`);

const fixtureChecks = [
  ['clean fixture filename', () => {
    assert.strictEqual(sanitizeFilename(extractTitle(dom.window.document)), '샘플 문서');
  }],
  ['single-line table rows', () => {
    const tableRows = markdown.match(/^\|.*\|$/gm) || [];
    assert(tableRows.length > 0);
    tableRows.forEach((row) => assert.doesNotMatch(row, /[\r\n]/));
  }],
  ['tablesorter header', () => {
    assert.match(markdown, /^\|\s*담당자\s*\|\s*업무\s*\|\s*비고\s*\|$/m);
  }],
  ['multi-block example cell', () => {
    assert.match(markdown, /^\|\s*홍길동\s*\|[^\r\n]*예시 설계[^\r\n]*문서 검토[^\r\n]*\|/m);
  }],
  ['mailto link', () => {
    assert.match(markdown, /\]\(mailto:owner@example\.com\)/);
  }],
  ['info macro blockquote', () => {
    assert.match(markdown, /^>\s+.*예시 승인 담당자에게 문의.*$/m);
  }],
  ['no tablesorter markup', () => {
    assert.doesNotMatch(markdown, /headerButton|tablesorter/i);
  }]
];
for (const [name, check] of fixtureChecks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${fixtureChecks.length} fixture checks`);
dom.window.close();
process.exit(0);
