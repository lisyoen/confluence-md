(function () {
  'use strict';

  function safeFilename(value) {
    var name = (value || 'confluence-page')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[.\s]+$/g, '')
      .trim();
    return (name || 'confluence-page').slice(0, 180) + '.md';
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.type !== 'download-confluence-markdown') return;

    var mainContent = document.querySelector('#main-content');
    if (!mainContent) {
      alert('Confluence 본문(#main-content)을 찾을 수 없습니다.');
      return;
    }

    try {
      var markdown = window.ConfluenceMd.convertConfluenceHtml(mainContent, { document: document });
      var titleElement = document.querySelector('#title-text');
      var title = titleElement ? titleElement.textContent : document.title;
      var url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeFilename(title);
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
