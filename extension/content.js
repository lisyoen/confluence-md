(function () {
  'use strict';

  if (window.__confluenceMdListenerAttached) { return; }
  window.__confluenceMdListenerAttached = true;

  chrome.runtime.onMessage.addListener(async function (message) {
    if (!message || message.type !== 'download-confluence-markdown') return;

    var mainContent = document.querySelector('#main-content');
    if (!mainContent) {
      alert('Confluence 본문(#main-content)을 찾을 수 없습니다.');
      return;
    }

    try {
      var markdown = window.ConfluenceMd.convertConfluenceHtml(mainContent, { document: document });
      var title = window.ConfluenceMd.extractTitle(document);
      var suffix = '';
      if (message.includeComments === true) {
        suffix = '-comments';
        try {
          var pageIdElement = document.querySelector('meta[name="ajs-page-id"]');
          var pageId = pageIdElement && pageIdElement.content;
          if (!pageId) throw new Error('페이지 ID를 찾을 수 없습니다.');

          var results = [];
          var start = 0;
          var batch;
          do {
            var response = await fetch(
              location.origin + '/rest/api/content/' + encodeURIComponent(pageId) +
                '/descendant/comment?expand=body.view,history,extensions,ancestors' +
                '&start=' + start + '&limit=100',
              { credentials: 'same-origin' }
            );
            if (!response.ok) {
              throw new Error(response.status + (response.statusText ? ' ' + response.statusText : ''));
            }
            var payload = await response.json();
            batch = payload.results || [];
            results = results.concat(batch);
            start += 100;
          } while (batch.length === 100);

          var tree = window.ConfluenceMdComments.buildCommentTree(results);
          var commentsMarkdown = window.ConfluenceMdComments.renderCommentsMarkdown(
            tree,
            results.length,
            function (html) {
              var wrapper = document.createElement('div');
              wrapper.innerHTML = html;
              return window.ConfluenceMd.convertConfluenceHtml(wrapper, { document: document });
            }
          );
          markdown += '\n' + commentsMarkdown + '\n';
        } catch (commentError) {
          console.error('Confluence 댓글 조회 실패:', commentError);
          markdown += '\n> ⚠️ 댓글 조회 실패: ' + commentError.message + '\n';
        }
      }
      var url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = window.ConfluenceMd.sanitizeFilename(title).slice(0, 180) + suffix + '.md';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (error) {
      console.error('Confluence Markdown 변환 실패:', error);
      alert('Markdown 변환 중 오류가 발생했습니다.');
    }
  });
}());
