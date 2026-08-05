(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ConfluenceMdComments = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function compareCreatedDate(a, b) {
    return String(a.createdDate || '').localeCompare(String(b.createdDate || ''));
  }

  function buildCommentTree(results) {
    var nodes = new Map();
    var parentIds = new Map();

    (results || []).forEach(function (result) {
      var commentAncestors = (result.ancestors || []).filter(function (ancestor) {
        return ancestor.type === 'comment';
      });
      var parent = commentAncestors.length
        ? commentAncestors[commentAncestors.length - 1].id
        : null;
      var node = {
        id: result.id,
        author: result.history && result.history.createdBy &&
          result.history.createdBy.displayName || '알 수 없음',
        createdDate: result.history && result.history.createdDate,
        location: result.extensions && result.extensions.location || 'footer',
        bodyHtml: result.body && result.body.view && result.body.view.value,
        children: []
      };
      nodes.set(String(result.id), node);
      parentIds.set(String(result.id), parent === null ? null : String(parent));
    });

    var tree = [];
    nodes.forEach(function (node, id) {
      var parentId = parentIds.get(id);
      if (parentId && nodes.has(parentId)) nodes.get(parentId).children.push(node);
      else tree.push(node);
    });

    function sortNodes(items) {
      items.sort(compareCreatedDate);
      items.forEach(function (item) { sortNodes(item.children); });
    }
    sortNodes(tree);
    return tree;
  }

  function formatCreatedDate(value) {
    var date = new Date(value);
    function pad(number) { return String(number).padStart(2, '0'); }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function renderCommentsMarkdown(tree, totalCount, convertHtml) {
    var sections = ['---', '', '## 댓글 (총 ' + totalCount + '개)'];
    if (totalCount === 0) return sections.concat(['', '_댓글 없음_']).join('\n');

    function renderNode(node, depth) {
      var level = Math.min(3 + depth, 6);
      var prefix = depth >= 1 ? '↳ ' : '';
      if (node.location === 'inline') prefix += '[인라인] ';
      sections.push(
        '',
        '#'.repeat(level) + ' ' + prefix + node.author + ' — ' +
          formatCreatedDate(node.createdDate),
        '',
        convertHtml(node.bodyHtml || '').trim()
      );
      node.children.forEach(function (child) { renderNode(child, depth + 1); });
    }
    (tree || []).forEach(function (node) { renderNode(node, 0); });
    return sections.join('\n');
  }

  return {
    buildCommentTree: buildCommentTree,
    renderCommentsMarkdown: renderCommentsMarkdown
  };
}));
