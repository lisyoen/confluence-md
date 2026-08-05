'use strict';

const assert = require('assert');
const fixture = require('./fixtures/comments-api.json');
const { buildCommentTree, renderCommentsMarkdown } = require('../extension/lib/comments');

const tree = buildCommentTree(fixture.results);
const converted = [];
const markdown = renderCommentsMarkdown(tree, fixture.results.length, (html) => {
  converted.push(html);
  return `converted:${html}`;
});

const checks = [
  ['tree structure and parent mapping', () => {
    assert.strictEqual(tree.length, 3);
    assert.strictEqual(tree.find((node) => node.id === 'top-1').children[0].id, 'reply-1');
  }],
  ['siblings sorted by createdDate', () => {
    assert.deepStrictEqual(tree.map((node) => node.id), ['inline-1', 'top-1', 'top-2']);
  }],
  ['heading levels and prefixes', () => {
    assert.match(markdown, /^### \[인라인\] 인라인 작성자 — /m);
    assert.match(markdown, /^#### ↳ 답글 작성자 — /m);
  }],
  ['convertHtml callback applied', () => {
    assert.strictEqual(converted.length, 4);
    assert.match(markdown, /converted:<p><strong>답글<\/strong> 내용<\/p>/);
  }],
  ['total count rendered', () => assert.match(markdown, /^## 댓글 \(총 4개\)$/m)],
  ['zero comments', () => {
    assert.strictEqual(renderCommentsMarkdown([], 0, () => ''), '---\n\n## 댓글 (총 0개)\n\n_댓글 없음_');
  }]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} comment checks`);
