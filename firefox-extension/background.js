"use strict";

// Firefox MV2: no session storage, use in-memory store
var tabData = {};

function tabKey(tabId) {
  return "tab:" + tabId;
}

browser.runtime.onMessage.addListener(function (message, sender) {
  if (message.type === "scanResult" && sender.tab) {
    var tabId = sender.tab.id;
    tabData[tabKey(tabId)] = message;
    updateBadge(tabId, message.totals.total);
    return;
  }

  if (message.type === "getResults") {
    return browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      if (tabs.length === 0) return null;
      return tabData[tabKey(tabs[0].id)] || null;
    });
  }

  if (message.type === "getSettings") {
    return browser.storage.local.get("tooltipEnabled").then(function (result) {
      return { tooltipEnabled: result.tooltipEnabled !== false };
    });
  }

  if (message.type === "setSettings") {
    return browser.storage.local.set({ tooltipEnabled: message.tooltipEnabled }).then(function () {
      return { ok: true };
    });
  }
});

function updateBadge(tabId, count) {
  var text = count > 0 ? String(count) : "0";
  browser.browserAction.setBadgeText({ text: text, tabId: tabId });
  browser.browserAction.setBadgeBackgroundColor({
    color: count > 0 ? "#e74c3c" : "#555555",
    tabId: tabId,
  });
}

browser.tabs.onRemoved.addListener(function (tabId) {
  delete tabData[tabKey(tabId)];
});

browser.tabs.onActivated.addListener(function (activeInfo) {
  var data = tabData[tabKey(activeInfo.tabId)];
  if (data) {
    updateBadge(activeInfo.tabId, data.totals.total);
  }
});
