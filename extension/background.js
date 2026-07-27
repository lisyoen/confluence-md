'use strict';

importScripts('lib/version.js');

var UPDATE_URL = 'https://raw.githubusercontent.com/lisyoen/confluence-md/main/publish/latest.json';
var DEFAULT_TITLE = 'Markdown으로 다운로드';
var NATIVE_HOST = 'io.github.lisyoen.confluence_md';

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Confluence Markdown',
    message: message
  });
}

async function checkForUpdate() {
  var remote;
  try {
    var response = await fetch(UPDATE_URL, { cache: 'no-store' });
    if (!response.ok) return;
    remote = await response.json();
  } catch (_error) {
    return;
  }

  if (ConfluenceMdVersion.compareVersions(
    remote.version,
    chrome.runtime.getManifest().version
  ) > 0) {
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
    chrome.action.setTitle({
      title: DEFAULT_TITLE + ' — 새 버전 v' + remote.version +
        ' 배포됨 (git pull 후 확장 새로고침)'
    });
    return;
  }

  chrome.action.setBadgeText({ text: '' });
  chrome.action.setTitle({ title: DEFAULT_TITLE });
}

function startUpdateChecks() {
  checkForUpdate();
  chrome.alarms.create('update-check', { periodInMinutes: 60 });
}

chrome.runtime.onInstalled.addListener(function () {
  startUpdateChecks();
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: 'update-now',
      title: '지금 업데이트 (git pull + 리로드)',
      contexts: ['action']
    });
  });
});
chrome.runtime.onStartup.addListener(startUpdateChecks);

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'update-check') checkForUpdate();
});

chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId !== 'update-now') return;

  chrome.runtime.sendNativeMessage(
    NATIVE_HOST,
    { action: 'update' },
    function (response) {
      if (chrome.runtime.lastError) {
        notify(
          '업데이트 헬퍼가 설치되어 있지 않습니다. clone 폴더의 ' +
          'updater\\install-updater.bat 을 1회 실행하거나, git pull 후 ' +
          '확장을 새로고침해 주세요.'
        );
        return;
      }

      if (!response || !response.ok) {
        var output = response && response.output
          ? String(response.output).slice(-300)
          : '응답이 없습니다.';
        notify('업데이트 실패: ' + output);
        return;
      }

      if (response.upToDate) {
        notify('이미 최신 버전입니다.');
        checkForUpdate();
        return;
      }

      notify('업데이트 완료. 확장을 다시 로드합니다.');
      setTimeout(function () {
        chrome.runtime.reload();
      }, 1000);
    }
  );
});

chrome.action.onClicked.addListener(function (tab) {
  checkForUpdate();
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'download-confluence-markdown' }).catch(function (error) {
    console.error('Confluence Markdown 메시지 전송 실패:', error);
  });
});
