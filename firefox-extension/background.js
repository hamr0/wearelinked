"use strict";

// Firefox MV2: no session storage, use in-memory store
var tabData = {};

function tabKey(tabId) {
  return "tab:" + tabId;
}

function mergeItems(existing, incoming) {
  var merged = existing.slice();
  for (var i = 0; i < incoming.length; i++) {
    var found = false;
    for (var j = 0; j < merged.length; j++) {
      if (merged[j].href === incoming[i].href) { found = true; break; }
    }
    if (!found) merged.push(incoming[i]);
  }
  return merged;
}

function recount(items) {
  var wrappers = 0;
  var tracked = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].isRedirectWrapper) wrappers++;
    if (items[i].trackingParams.length > 0) tracked++;
  }
  return { wrappers: wrappers, tracked: tracked, total: items.length };
}

browser.runtime.onMessage.addListener(function (message, sender) {
  if (message.type === "scanResult" && sender.tab) {
    var tabId = sender.tab.id;
    var key = tabKey(tabId);
    var existing = tabData[key];
    var merged = existing ? mergeItems(existing.items, message.items) : message.items;
    var totals = recount(merged);
    tabData[key] = {
      type: "scanResult",
      domain: message.domain,
      url: message.url,
      timestamp: message.timestamp,
      items: merged,
      totals: totals,
    };
    updateBadge(tabId, totals.total);
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
  browser.action.setBadgeText({ text: text, tabId: tabId });
  browser.action.setBadgeBackgroundColor({
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
