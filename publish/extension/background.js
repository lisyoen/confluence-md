'use strict';

chrome.action.onClicked.addListener(function (tab) {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'download-confluence-markdown' }).catch(function (error) {
    console.error('Confluence Markdown 메시지 전송 실패:', error);
  });
});
