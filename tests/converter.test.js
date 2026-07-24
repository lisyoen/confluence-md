'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { convertConfluenceHtml } = require('../src/converter');

const samplePath = path.join(__dirname, '..', 'samples', 'Confluence.html');
const html = fs.readFileSync(samplePath, 'utf8');
const dom = new JSDOM(html, { url: 'https://confluence.score/pages/viewpage.action?pageId=362457980' });
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
  ['absolute Confluence link', () => assert.match(markdown, /\]\(https:\/\/confluence\.score\/[^)]*\)/)]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} checks`);
dom.window.close();
process.exit(0);
