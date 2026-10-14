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

  var CELL_BREAK = '\uE000';
  var CODE_LANGUAGES = [
    'applescript', 'as3', 'bash', 'c', 'clojure', 'cpp', 'csharp', 'css',
    'delphi', 'diff', 'erl', 'erlang', 'groovy', 'java', 'javafx', 'js',
    'json', 'kotlin', 'perl', 'php', 'plain', 'plaintext', 'powershell',
    'python', 'ruby', 'rust', 'sass', 'scala', 'shell', 'sql', 'swift',
    'text', 'typescript', 'vb', 'xml', 'yaml'
  ];
  var CODE_HEADER_LANGUAGES = {
    'javascript': 'js',
    'js': 'js',
    'bash': 'bash',
    'shell': 'bash',
    'python': 'python',
    'java': 'java',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'json': 'json'
  };

  function replaceWithText(element, text, document) {
    element.replaceWith(document.createTextNode(text));
  }

  function extractTitle(document) {
    if (!document) return '';
    var titleElement = document.querySelector('#title-text');
    return ((titleElement && titleElement.textContent) || document.title || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sanitizeFilename(title) {
    var filename = (title || '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/^[_.\s]+|[_.\s]+$/g, '');
    return filename || 'confluence-page';
  }

  function isBlockElement(node) {
    return node.nodeType === 1 &&
      ['P', 'DIV', 'UL', 'OL', 'LI', 'BR', 'PRE'].includes(node.tagName);
  }

  function appendCellContent(source, target, document, listType, listIndex) {
    Array.from(source.childNodes).forEach(function (node, index) {
      if (node.nodeType === 3) {
        target.appendChild(document.createTextNode(node.nodeValue.replace(/\s+/g, ' ')));
        return;
      }
      if (node.nodeType !== 1) return;

      if (node.tagName === 'BR') {
        target.appendChild(document.createTextNode(CELL_BREAK));
        return;
      }
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        Array.from(node.children).filter(function (child) {
          return child.tagName === 'LI';
        }).forEach(function (item, itemIndex) {
          if (target.textContent.trim()) target.appendChild(document.createTextNode(CELL_BREAK));
          target.appendChild(document.createTextNode(
            node.tagName === 'OL' ? (itemIndex + 1) + '. ' : '- '
          ));
          appendCellContent(item, target, document, node.tagName, itemIndex + 1);
        });
        return;
      }
      if (node.tagName === 'LI') {
        target.appendChild(document.createTextNode(
          listType === 'OL' ? listIndex + '. ' : '- '
        ));
      }

      if (isBlockElement(node) && target.textContent.trim()) {
        target.appendChild(document.createTextNode(CELL_BREAK));
      }
      if (isBlockElement(node)) {
        appendCellContent(node, target, document, listType, listIndex);
      } else {
        var inline = node.cloneNode(false);
        target.appendChild(inline);
        appendCellContent(node, inline, document, listType, listIndex);
      }
      if (
        isBlockElement(node) &&
        index < source.childNodes.length - 1 &&
        !target.textContent.endsWith(CELL_BREAK)
      ) {
        target.appendChild(document.createTextNode(CELL_BREAK));
      }
    });
  }

  function flattenTableCell(cell, document) {
    var content = document.createDocumentFragment();
    appendCellContent(cell, content, document);
    cell.replaceChildren(content);
    var walker = document.createTreeWalker(cell, 4);
    var textNode;
    while ((textNode = walker.nextNode())) {
      textNode.nodeValue = textNode.nodeValue
          .replace(/\|/g, '\\|')
          .replace(new RegExp(CELL_BREAK + '+', 'g'), CELL_BREAK);
    }
  }

  function normalizeTables(root, document) {
    root.querySelectorAll('table').forEach(function (table) {
      if (table.closest('.syntaxhighlighter, .code.panel, [data-macro-name="code"], pre')) {
        return;
      }

      Array.from(table.querySelectorAll('thead')).forEach(function (header) {
        if (/display\s*:\s*none/i.test(header.getAttribute('style') || '')) header.remove();
      });

      var headers = Array.from(table.querySelectorAll(':scope > thead'));
      if (headers.length > 1) {
        var seen = [];
        headers.forEach(function (header) {
          var content = header.textContent.replace(/\s+/g, ' ').trim();
          if (seen.includes(content)) header.remove();
          else seen.push(content);
        });
      }

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
            flattenTableCell(cell, document);
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
        return CODE_LANGUAGES.includes(name.toLowerCase()) &&
          !name.toLowerCase().startsWith('sh-');
      }) || '';
    }
    if (!language) {
      var header = panel.querySelector('.codeHeader b');
      var headerText = ((header && header.textContent) || '')
        .toLowerCase()
        .replace(/\s*-\s*collapsed\s*$/, '')
        .trim();
      language = CODE_HEADER_LANGUAGES[headerText] || '';
    }

    if (highlighter) {
      highlighter.querySelectorAll(
        '.toolbar, .expand-control, .collapse-source, ' +
        'a.expandSource, a[class*="command_expand"], a[class*="command_collapse"], ' +
        'span[class*="expand-control"], span[class*="collapse-control"]'
      ).forEach(function (control) {
        control.remove();
      });
    }

    var lines = Array.from(panel.querySelectorAll('.syntaxhighlighter td.code .line'));
    if (!lines.length) {
      lines = Array.from(panel.querySelectorAll('.syntaxhighlighter .line'));
    }
    var code = lines.length
      ? lines.map(function (line) { return line.textContent; }).join('\n')
      : ((panel.querySelector('.codeContent, pre, code') || panel).textContent || '');

    var codeLines = code.replace(/\u00a0/g, ' ').split('\n');
    while (codeLines.length && !codeLines[0].trim()) codeLines.shift();
    while (codeLines.length && !codeLines[codeLines.length - 1].trim()) codeLines.pop();
    var commonIndent = codeLines.reduce(function (minimum, line) {
      if (!line.trim()) return minimum;
      var indent = (line.match(/^[ \t]*/) || [''])[0].length;
      return minimum === null ? indent : Math.min(minimum, indent);
    }, null) || 0;
    if (commonIndent) {
      codeLines = codeLines.map(function (line) {
        return line.slice(commonIndent);
      });
    }
    return {
      language: language.toLowerCase(),
      code: codeLines.join('\n')
    };
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
    root.querySelectorAll('.expand-content, .rwui_expandable_item_body').forEach(function (body) {
      body.classList.remove('expand-hidden', 'hidden');
      body.removeAttribute('hidden');
      body.style.display = '';
    });

    root.querySelectorAll('[style]').forEach(function (node) {
      if (/display\s*:\s*none/i.test(node.getAttribute('style') || '')) node.remove();
    });

    root.querySelectorAll(
      '.confluence-information-macro[data-macro-name="info"], ' +
      '.confluence-information-macro[data-macro-name="note"], ' +
      '.confluence-information-macro[data-macro-name="warning"], ' +
      '.confluence-information-macro[data-macro-name="tip"]'
    ).forEach(function (macro) {
      macro.querySelectorAll('.confluence-information-macro-icon').forEach(function (icon) {
        icon.remove();
      });
      var body = macro.querySelector('.confluence-information-macro-body') || macro;
      var blockquote = document.createElement('blockquote');
      while (body.firstChild) blockquote.appendChild(body.firstChild);
      macro.replaceWith(blockquote);
    });

    normalizeCodePanels(root, document);
    normalizeTables(root, document);

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

    service.addRule('confluenceTaskList', {
      filter: function (node) {
        return node.nodeName === 'UL' &&
          node.classList.contains('inline-task-list') &&
          !(node.parentElement &&
            node.parentElement.matches('li[data-confluence-task]'));
      },
      replacement: function (_content, node) {
        function serialize(list, depth) {
          return Array.from(list.children).filter(function (child) {
            return child.matches('li[data-confluence-task]');
          }).map(function (item) {
            var checked = item.getAttribute('data-confluence-task');
            var label = Array.from(item.childNodes).filter(function (child) {
              return !(child.nodeType === 1 &&
                (child.tagName === 'UL' || child.tagName === 'OL'));
            }).map(function (child) {
              return child.textContent || '';
            }).join('').replace(/\s+/g, ' ').trim();
            var line = '    '.repeat(depth) + '- [' + checked + '] ' + label;
            var nested = Array.from(item.children).find(function (child) {
              return child.tagName === 'UL' &&
                child.classList.contains('inline-task-list');
            });
            return nested ? line + '\n' + serialize(nested, depth + 1) : line;
          }).join('\n');
        }
        return '\n' + serialize(node, 0) + '\n';
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
      .replace(new RegExp(CELL_BREAK, 'g'), '  ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    markdown = markdown.split('\n').map(function (line) {
      return /^\|.*\|$/.test(line) ? line.replace(/ {2,}/g, '  ') : line;
    }).join('\n');
    return markdown + '\n';
  }

  return {
    convertConfluenceHtml: convertConfluenceHtml,
    extractTitle: extractTitle,
    sanitizeFilename: sanitizeFilename
  };
}));
