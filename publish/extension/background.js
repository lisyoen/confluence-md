'use strict';

importScripts('lib/version.js');

var UPDATE_URL = 'https://raw.githubusercontent.com/lisyoen/confluence-md/main/publish/latest.json';
var DEFAULT_TITLE = 'Markdown으로 다운로드';

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
  chrome.alarms.create('update-check', { periodInMinutes: 360 });
}

chrome.runtime.onInstalled.addListener(startUpdateChecks);
chrome.runtime.onStartup.addListener(startUpdateChecks);

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'update-check') checkForUpdate();
});

chrome.action.onClicked.addListener(function (tab) {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'download-confluence-markdown' }).catch(function (error) {
    console.error('Confluence Markdown 메시지 전송 실패:', error);
  });
});
