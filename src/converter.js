(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('turndown'),
      require('turndown-plugin-gfm')
    );
  } else {
    root.ConfluenceMd = factory(root.TurndownService, root.turndownPluginGfm);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (TurndownService, gfmPlugin) {
  'use strict';

  function replaceWithText(element, text, document) {
    element.replaceWith(document.createTextNode(text));
  }

  function normalizeTables(root, document) {
    root.querySelectorAll('thead.tableFloatingHeaderOriginal').forEach(function (header) {
      header.remove();
    });

    root.querySelectorAll('table').forEach(function (table) {
      Array.from(table.querySelectorAll('thead, tbody, tfoot')).forEach(function (section) {
        var pending = [];
        var rows = Array.from(section.children).filter(function (child) {
          return child.tagName === 'TR';
        });

        rows.forEach(function (row) {
          var originalCells = Array.from(row.children).filter(function (child) {
            return child.tagName === 'TD' || child.tagName === 'TH';
          });
          var output = [];
          var column = 0;

          function addPendingCells() {
            while (pending[column] > 0) {
              output.push(document.createElement('td'));
              pending[column] -= 1;
              column += 1;
            }
          }

          originalCells.forEach(function (cell) {
            addPendingCells();
            cell.querySelectorAll('br').forEach(function (lineBreak) { lineBreak.remove(); });
            var colspan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10));
            var rowspan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10));
            cell.removeAttribute('colspan');
            cell.removeAttribute('rowspan');
            output.push(cell);

            for (var offset = 0; offset < colspan; offset += 1) {
              if (rowspan > 1) {
                pending[column + offset] = Math.max(pending[column + offset] || 0, rowspan - 1);
              }
              if (offset > 0) {
                output.push(document.createElement(cell.tagName.toLowerCase()));
              }
            }
            column += colspan;
          });
          addPendingCells();
          row.replaceChildren.apply(row, output);
        });
      });
    });
  }

  function extractCode(panel) {
    var highlighter = panel.querySelector('.syntaxhighlighter');
    var language = '';
    if (highlighter) {
      language = Array.from(highlighter.classList).find(function (name) {
        return !['syntaxhighlighter', 'collapsed', 'nogutter', 'sh-midnight'].includes(name);
      }) || '';
    }

    var lines = Array.from(panel.querySelectorAll('.syntaxhighlighter .line'));
    var code = lines.length
      ? lines.map(function (line) { return line.textContent; }).join('\n')
      : ((panel.querySelector('.codeContent, pre, code') || panel).textContent || '');

    return { language: language, code: code.replace(/\u00a0/g, ' ').trimEnd() };
  }

  function normalizeCodePanels(root, document) {
    root.querySelectorAll('.code.panel, [data-macro-name="code"]').forEach(function (panel) {
      var extracted = extractCode(panel);
      var pre = document.createElement('pre');
      var code = document.createElement('code');
      if (extracted.language) code.className = 'language-' + extracted.language;
      code.textContent = extracted.code;
      pre.appendChild(code);
      panel.replaceWith(pre);
    });
  }

  function preprocess(root, document) {
    normalizeTables(root, document);
    normalizeCodePanels(root, document);

    root.querySelectorAll('.expand-content, .rwui_expandable_item_body').forEach(function (body) {
      body.classList.remove('expand-hidden', 'hidden');
      body.removeAttribute('hidden');
      body.style.display = '';
    });

    root.querySelectorAll('.aui-lozenge').forEach(function (status) {
      var normalized = document.createElement('span');
      normalized.setAttribute('data-confluence-status', '');
      normalized.textContent = status.textContent.trim();
      status.replaceWith(normalized);
    });

    root.querySelectorAll('.inline-task-list li').forEach(function (item) {
      item.setAttribute(
        'data-confluence-task',
        item.getAttribute('aria-checked') === 'true' ? 'x' : ' '
      );
    });

    root.querySelectorAll('img.emoticon, img, .plugin_attachments_container').forEach(function (node) {
      node.remove();
    });
    root.querySelectorAll(
      'a[href*="/download/attachments/"], a[data-linked-resource-type="attachment"], ' +
      '.confluence-embedded-file-wrapper'
    ).forEach(function (node) {
      node.remove();
    });

    root.querySelectorAll('a[href]').forEach(function (link) {
      var rawHref = link.getAttribute('href');
      if (rawHref === '#') {
        replaceWithText(link, link.textContent, document);
        return;
      }
      try {
        link.setAttribute('href', new URL(rawHref, document.baseURI).href);
      } catch (_error) {
        // Turndown can safely retain unusual schemes and malformed legacy links.
      }
    });
  }

  function convertConfluenceHtml(mainContentElement, options) {
    if (!mainContentElement || typeof mainContentElement.cloneNode !== 'function') {
      throw new TypeError('mainContentElement must be a DOM Element');
    }
    options = options || {};
    var document = options.document || mainContentElement.ownerDocument;
    if (!document) throw new TypeError('A document is required');

    var root = mainContentElement.cloneNode(true);
    preprocess(root, document);

    var service = new TurndownService({
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      headingStyle: 'atx'
    });
    var gfm = gfmPlugin && (gfmPlugin.gfm || gfmPlugin);
    if (typeof gfm === 'function') service.use(gfm);

    service.addRule('confluenceTaskItem', {
      filter: function (node) {
        return node.nodeName === 'LI' && node.hasAttribute('data-confluence-task');
      },
      replacement: function (content, node) {
        var checked = node.getAttribute('data-confluence-task');
        return '\n- [' + checked + '] ' + content.trim() + '\n';
      }
    });
    service.addRule('confluenceStatus', {
      filter: function (node) {
        return node.nodeName === 'SPAN' && node.hasAttribute('data-confluence-status');
      },
      replacement: function (content) {
        return '[' + content.trim() + ']';
      }
    });

    var markdown = service.turndown(root)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (
      document.baseURI &&
      /^https?:\/\//i.test(document.baseURI) &&
      !/\]\(https?:\/\/[^)]+\)/i.test(markdown)
    ) {
      markdown += '\n\n[Confluence 원문](' + document.baseURI + ')';
    }
    return markdown + '\n';
  }

  return { convertConfluenceHtml: convertConfluenceHtml };
}));
