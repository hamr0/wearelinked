"use strict";

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

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "scanResult" && sender.tab) {
    var tabId = sender.tab.id;
    var key = tabKey(tabId);
    chrome.storage.session.get(key, function (result) {
      var existing = result[key];
      var merged = existing ? mergeItems(existing.items, message.items) : message.items;
      var totals = recount(merged);
      var obj = {};
      obj[key] = {
        type: "scanResult",
        domain: message.domain,
        url: message.url,
        timestamp: message.timestamp,
        items: merged,
        totals: totals,
      };
      chrome.storage.session.set(obj);
      updateBadge(tabId, totals.total);
    });
  }

  if (message.type === "getResults") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        sendResponse(null);
        return;
      }
      var tabId = tabs[0].id;
      chrome.storage.session.get(tabKey(tabId), function (result) {
        sendResponse(result[tabKey(tabId)] || null);
      });
    });
    return true;
  }

  if (message.type === "getSettings") {
    chrome.storage.local.get("tooltipEnabled", function (result) {
      sendResponse({ tooltipEnabled: result.tooltipEnabled !== false });
    });
    return true;
  }

  if (message.type === "setSettings") {
    chrome.storage.local.set({ tooltipEnabled: message.tooltipEnabled });
    sendResponse({ ok: true });
    return true;
  }
});

function updateBadge(tabId, count) {
  var text = count > 0 ? String(count) : "0";
  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? "#e74c3c" : "#555555",
    tabId: tabId,
  });
}

chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove(tabKey(tabId));
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.storage.session.get(tabKey(activeInfo.tabId), function (result) {
    var data = result[tabKey(activeInfo.tabId)];
    if (data) {
      updateBadge(activeInfo.tabId, data.totals.total);
    }
  });
});
