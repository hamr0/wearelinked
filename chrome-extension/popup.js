"use strict";

var PARAM_TO_PROVIDER = {
  "utm_source": "Google Analytics", "utm_medium": "Google Analytics", "utm_campaign": "Google Analytics",
  "utm_term": "Google Analytics", "utm_content": "Google Analytics", "utm_id": "Google Analytics",
  "gclid": "Google", "dclid": "Google", "_ga": "Google", "_gl": "Google",
  "fbclid": "Meta", "igshid": "Instagram", "msclkid": "Microsoft",
  "mc_eid": "Mailchimp", "mc_cid": "Mailchimp",
  "_hsenc": "HubSpot", "_hsmi": "HubSpot", "_openstat": "OpenStat",
  "yclid": "Yandex", "twclid": "X", "ttclid": "TikTok",
  "li_fat_id": "LinkedIn", "ref_src": "Referral", "ref_url": "Referral",
};

var PROVIDER_COLORS = {
  "Google Analytics": "#4285f4", "Google": "#4285f4", "Meta": "#1877f2",
  "Instagram": "#e1306c", "Microsoft": "#00a4ef", "Mailchimp": "#ffe01b",
  "HubSpot": "#ff7a59", "OpenStat": "#9b59b6", "Yandex": "#fc3f1d",
  "X": "#a0a0a0", "TikTok": "#ee1d52", "LinkedIn": "#0a66c2", "Referral": "#888888",
};

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
    details.push("on " + domainSummary(trackingDomains));
  }

  var context = el("div", "breakdown-context");
  context.textContent = details.join(" \u00B7 ");
  container.appendChild(context);

  // Provider pills
  if (totals.tracked > 0) {
    var providers = {};
    var paramKeys = Object.keys(allParams);
    for (var p = 0; p < paramKeys.length; p++) {
      var prov = PARAM_TO_PROVIDER[paramKeys[p]];
      if (prov && !providers[prov]) providers[prov] = [];
      if (prov) providers[prov].push(paramKeys[p]);
    }
    var pillRow = el("div", "provider-pills");
    var provNames = Object.keys(providers);
    for (var q = 0; q < provNames.length; q++) {
      var pill = el("span", "provider-pill");
      pill.textContent = provNames[q];
      pill.title = providers[provNames[q]].join(", ");
      var color = PROVIDER_COLORS[provNames[q]] || "#888";
      pill.style.background = color + "22";
      pill.style.color = color;
      pill.style.borderColor = color + "44";
      pillRow.appendChild(pill);
    }
    container.appendChild(pillRow);
  }
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
