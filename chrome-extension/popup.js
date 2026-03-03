"use strict";

document.addEventListener("DOMContentLoaded", function () {
  // Load tooltip toggle state
  chrome.runtime.sendMessage({ type: "getSettings" }, function (settings) {
    var toggle = document.getElementById("tooltip-toggle");
    if (toggle && settings) {
      toggle.checked = settings.tooltipEnabled;
    }
  });

  // Load scan results
  chrome.runtime.sendMessage({ type: "getResults" }, function (data) {
    render(data);
  });

  // Tooltip toggle handler
  var toggle = document.getElementById("tooltip-toggle");
  if (toggle) {
    toggle.addEventListener("change", function () {
      chrome.runtime.sendMessage({
        type: "setSettings",
        tooltipEnabled: toggle.checked,
      });
    });
  }
});

function render(data) {
  var verdictEl = document.getElementById("verdict");
  var breakdownEl = document.getElementById("breakdown");
  var emptyEl = document.getElementById("empty");

  if (!data || !data.items || data.items.length === 0) {
    verdictEl.appendChild(buildVerdict(data ? data.domain : "Unknown", 0));
    emptyEl.classList.remove("hidden");
    return;
  }

  verdictEl.appendChild(buildVerdict(data.domain, data.totals.total));

  if (data.totals.total > 0) {
    breakdownEl.classList.remove("hidden");
    buildBreakdown(breakdownEl, data.items, data.totals);
  } else {
    emptyEl.classList.remove("hidden");
  }
}

function buildVerdict(domain, total) {
  var level = "clean";
  var message = "No links tracking your clicks.";
  if (total > 0 && total <= 5) {
    level = "warn";
    message = total + " link" + (total !== 1 ? "s" : "") + " on this page know where you came from.";
  } else if (total > 5) {
    level = "bad";
    message = total + " links on this page report your clicks to advertisers.";
  }

  var wrap = el("div", "verdict verdict-" + level);

  var domainEl = el("div", "verdict-domain");
  domainEl.textContent = domain;
  wrap.appendChild(domainEl);

  var countEl = el("div", "verdict-count");
  var num = el("span", "verdict-flagged");
  num.textContent = total;
  countEl.appendChild(num);
  wrap.appendChild(countEl);

  var msg = el("div", "verdict-message");
  msg.textContent = message;
  wrap.appendChild(msg);

  if (total > 0) {
    var hint = el("div", "verdict-hint");
    hint.textContent = "Look for red underlines on the page. Hover for details.";
    wrap.appendChild(hint);
  }

  return wrap;
}

function buildBreakdown(container, items, totals) {
  // Count line: "5 redirects · 3 tracking tags"
  var counts = [];
  if (totals.wrappers > 0) counts.push(totals.wrappers + " redirect" + (totals.wrappers !== 1 ? "s" : ""));
  if (totals.tracked > 0) counts.push(totals.tracked + " tracking tag" + (totals.tracked !== 1 ? "s" : ""));

  var summary = el("div", "breakdown-counts");
  summary.textContent = counts.join(" \u00B7 ");
  container.appendChild(summary);

  // Context line: domains and param names
  var details = [];

  if (totals.wrappers > 0) {
    var redirectDomains = {};
    for (var i = 0; i < items.length; i++) {
      if (items[i].isRedirectWrapper) {
        var d = items[i].domain || "unknown";
        redirectDomains[d] = (redirectDomains[d] || 0) + 1;
      }
    }
    details.push("via " + domainSummary(redirectDomains));
  }

  if (totals.tracked > 0) {
    var trackingDomains = {};
    var allParams = {};
    for (var j = 0; j < items.length; j++) {
      if (items[j].trackingParams.length > 0) {
        var td = items[j].domain || "unknown";
        trackingDomains[td] = (trackingDomains[td] || 0) + 1;
      }
      for (var k = 0; k < items[j].trackingParams.length; k++) {
        allParams[items[j].trackingParams[k]] = true;
      }
    }
    var paramNames = Object.keys(allParams);
    details.push(paramNames.join(", ") + " on " + domainSummary(trackingDomains));
  }

  var context = el("div", "breakdown-context");
  context.textContent = details.join(" \u00B7 ");
  container.appendChild(context);
}

function domainSummary(domainCounts) {
  var domains = Object.keys(domainCounts).sort(function (a, b) {
    return domainCounts[b] - domainCounts[a];
  });
  if (domains.length <= 2) return domains.join(", ");
  return domains[0] + " + " + (domains.length - 1) + " more";
}

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
