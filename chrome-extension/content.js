"use strict";

// ── Tracking parameters mapped to providers ──

var TRACKING_PROVIDERS = {
  "utm_source":   { provider: "Google Analytics", color: "#4285f4" },
  "utm_medium":   { provider: "Google Analytics", color: "#4285f4" },
  "utm_campaign": { provider: "Google Analytics", color: "#4285f4" },
  "utm_term":     { provider: "Google Analytics", color: "#4285f4" },
  "utm_content":  { provider: "Google Analytics", color: "#4285f4" },
  "utm_id":       { provider: "Google Analytics", color: "#4285f4" },
  "gclid":        { provider: "Google",           color: "#4285f4" },
  "dclid":        { provider: "Google",           color: "#4285f4" },
  "_ga":          { provider: "Google",           color: "#4285f4" },
  "_gl":          { provider: "Google",           color: "#4285f4" },
  "fbclid":       { provider: "Meta",             color: "#1877f2" },
  "igshid":       { provider: "Instagram",        color: "#e1306c" },
  "msclkid":      { provider: "Microsoft",        color: "#00a4ef" },
  "mc_eid":       { provider: "Mailchimp",        color: "#ffe01b" },
  "mc_cid":       { provider: "Mailchimp",        color: "#ffe01b" },
  "_hsenc":       { provider: "HubSpot",          color: "#ff7a59" },
  "_hsmi":        { provider: "HubSpot",          color: "#ff7a59" },
  "_openstat":    { provider: "OpenStat",         color: "#9b59b6" },
  "yclid":        { provider: "Yandex",           color: "#fc3f1d" },
  "twclid":       { provider: "X",                color: "#a0a0a0" },
  "ttclid":       { provider: "TikTok",           color: "#ee1d52" },
  "li_fat_id":    { provider: "LinkedIn",         color: "#0a66c2" },
  "ref_src":      { provider: "Referral",         color: "#888888" },
  "ref_url":      { provider: "Referral",         color: "#888888" },
};

var TRACKING_PARAMS = Object.keys(TRACKING_PROVIDERS);

// ── Redirect wrapper definitions ──

var REDIRECT_WRAPPERS = [
  { pattern: "google.com/url", params: ["q", "url"], name: "Google" },
  { pattern: "l.facebook.com/l.php", params: ["u"], name: "Facebook" },
  { pattern: "youtube.com/redirect", params: ["q"], name: "YouTube" },
  { pattern: "safelinks.protection.outlook.com", params: ["url"], name: "Outlook SafeLinks" },
];

var SHORTENER_DOMAINS = ["t.co", "bit.ly", "tinyurl.com", "ow.ly", "goo.gl"];
var REDIRECT_DOMAINS = ["click.redditmail.com"];

// ── State ──

var items = [];
var tooltipEnabled = true;
var tooltipEl = null;

// ── URL analysis ──

function getTrackingParams(url) {
  var found = [];
  try {
    var params = new URL(url).searchParams;
    for (var i = 0; i < TRACKING_PARAMS.length; i++) {
      if (params.has(TRACKING_PARAMS[i])) {
        found.push(TRACKING_PARAMS[i]);
      }
    }
  } catch (e) {}
  return found;
}

function checkRedirectWrapper(url) {
  try {
    var parsed = new URL(url);
    var host = parsed.hostname.replace(/^www\./, "");
    var path = parsed.pathname;

    for (var i = 0; i < REDIRECT_WRAPPERS.length; i++) {
      var w = REDIRECT_WRAPPERS[i];
      var parts = w.pattern.split("/");
      var wrapperHost = parts[0];
      var wrapperPath = "/" + parts.slice(1).join("/");

      if (host === wrapperHost && path === wrapperPath) {
        for (var j = 0; j < w.params.length; j++) {
          var dest = parsed.searchParams.get(w.params[j]);
          if (dest) {
            try { dest = decodeURIComponent(dest); } catch (e) {}
            return { name: w.name, unwrappedUrl: dest };
          }
        }
      }
    }

    for (var s = 0; s < SHORTENER_DOMAINS.length; s++) {
      if (host === SHORTENER_DOMAINS[s]) {
        return { name: host + " (shortener)", unwrappedUrl: null };
      }
    }

    for (var r = 0; r < REDIRECT_DOMAINS.length; r++) {
      if (host === REDIRECT_DOMAINS[r]) {
        return { name: host + " (redirect)", unwrappedUrl: null };
      }
    }
  } catch (e) {}
  return null;
}

function cleanUrl(url) {
  try {
    var parsed = new URL(url);
    var changed = false;
    for (var i = 0; i < TRACKING_PARAMS.length; i++) {
      if (parsed.searchParams.has(TRACKING_PARAMS[i])) {
        parsed.searchParams.delete(TRACKING_PARAMS[i]);
        changed = true;
      }
    }
    return changed ? parsed.toString() : url;
  } catch (e) {
    return url;
  }
}

function getProviderGroups(params) {
  var groups = {};
  for (var i = 0; i < params.length; i++) {
    var info = TRACKING_PROVIDERS[params[i]];
    if (!info) continue;
    if (!groups[info.provider]) {
      groups[info.provider] = { color: info.color, params: [] };
    }
    groups[info.provider].params.push(params[i]);
  }
  return groups;
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch (e) { return ""; }
}

// ── Link scanning ──

function analyzeLink(href) {
  if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("#")) return null;

  var trackingParams = getTrackingParams(href);
  var wrapper = checkRedirectWrapper(href);

  if (trackingParams.length === 0 && !wrapper) return null;

  return {
    href: href,
    cleanHref: wrapper && wrapper.unwrappedUrl ? cleanUrl(wrapper.unwrappedUrl) : cleanUrl(href),
    domain: getDomain(href),
    trackingParams: trackingParams,
    isRedirectWrapper: !!wrapper,
    wrapperName: wrapper ? wrapper.name : null,
    unwrappedUrl: wrapper ? wrapper.unwrappedUrl : null,
  };
}

function scanLinks() {
  items = [];
  var anchors = document.querySelectorAll("a[href]");
  for (var i = 0; i < anchors.length; i++) {
    var result = analyzeLink(anchors[i].href);
    if (result) {
      var exists = false;
      for (var j = 0; j < items.length; j++) {
        if (items[j].href === result.href) { exists = true; break; }
      }
      if (!exists) items.push(result);
    }
  }
  if (tooltipEnabled) highlightLinks();
  sendResults();
}

function scanElement(el) {
  if (el.tagName !== "A" || !el.href) return;
  var result = analyzeLink(el.href);
  if (!result) return;
  for (var i = 0; i < items.length; i++) {
    if (items[i].href === result.href) return;
  }
  items.push(result);
  if (tooltipEnabled) highlightAnchor(el);
  sendResults();
}

function sendResults() {
  var wrappers = 0;
  var tracked = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].isRedirectWrapper) wrappers++;
    if (items[i].trackingParams.length > 0) tracked++;
  }

  chrome.runtime.sendMessage({
    type: "scanResult",
    domain: location.hostname,
    url: location.href,
    timestamp: Date.now(),
    items: items,
    totals: { wrappers: wrappers, tracked: tracked, total: items.length },
  });
}

// ── Link highlighting ──

function highlightAnchor(anchor) {
  if (anchor.getAttribute("data-wearelinked")) return;
  anchor.setAttribute("data-wearelinked", "true");
}

function highlightLinks() {
  var anchors = document.querySelectorAll("a[href]");
  for (var i = 0; i < anchors.length; i++) {
    for (var j = 0; j < items.length; j++) {
      if (items[j].href === anchors[i].href) {
        highlightAnchor(anchors[i]);
        break;
      }
    }
  }
}

function unhighlightLinks() {
  var marked = document.querySelectorAll("a[data-wearelinked]");
  for (var i = 0; i < marked.length; i++) {
    marked[i].removeAttribute("data-wearelinked");
  }
}

// ── Tooltip ──

function createTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.id = "__wearelinked_tooltip__";
  var s = tooltipEl.style;
  s.position = "fixed";
  s.zIndex = "2147483647";
  s.maxWidth = "420px";
  s.padding = "10px 14px";
  s.background = "#1a1a2e";
  s.color = "#e0e0e0";
  s.borderRadius = "6px";
  s.fontSize = "12px";
  s.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  s.lineHeight = "1.5";
  s.boxShadow = "0 4px 20px rgba(0,0,0,0.5)";
  s.border = "1px solid #2a2a4a";
  s.pointerEvents = "none";
  s.display = "none";
  s.wordBreak = "break-all";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(anchor, x, y) {
  if (!tooltipEnabled) return;

  var item = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].href === anchor.href) { item = items[i]; break; }
  }
  if (!item) return;

  var tip = createTooltip();
  while (tip.firstChild) tip.removeChild(tip.firstChild);

  if (item.isRedirectWrapper) {
    tip.appendChild(styledDiv("#e74c3c", "font-weight:600;margin-bottom:4px", item.wrapperName + " redirect"));
    if (item.unwrappedUrl) {
      tip.appendChild(styledDiv("#888", "font-size:11px", "Real destination:"));
      tip.appendChild(styledDiv("#6bc5e7", "font-family:monospace;font-size:11px;margin-bottom:6px", getDomain(item.unwrappedUrl)));
    } else {
      tip.appendChild(styledDiv("#888", "font-size:11px;margin-bottom:6px", "Cannot resolve locally"));
    }
  }

  if (item.trackingParams.length > 0) {
    if (!item.isRedirectWrapper) {
      tip.appendChild(styledDiv("#e0a458", "font-weight:600;margin-bottom:4px", "This link is tracking your click"));
    }
    tip.appendChild(styledDiv("#e0a458", "font-weight:600",
      item.trackingParams.length + " tracking tag" + (item.trackingParams.length !== 1 ? "s" : "") + " on this link"));
    tip.appendChild(createPillRow(getProviderGroups(item.trackingParams)));
  }

  tip.appendChild(styledDiv("#4a9", "font-family:monospace;font-size:11px;margin-top:6px;border-top:1px solid #2a2a4a;padding-top:6px",
    truncate(item.cleanHref, 120)));
  tip.style.display = "block";

  var rect = tip.getBoundingClientRect();
  var left = x + 12;
  var top = y + 12;
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 12;
  if (top + rect.height > window.innerHeight - 8) top = y - rect.height - 12;
  if (left < 4) left = 4;
  if (top < 4) top = 4;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = "none";
}

function styledDiv(color, style, text) {
  var d = document.createElement("div");
  d.style.cssText = "color:" + color + ";" + style;
  d.textContent = text;
  return d;
}

function createPill(name, color) {
  var pill = document.createElement("span");
  pill.textContent = name;
  pill.style.cssText = "display:inline-block;padding:2px 8px;margin:2px 3px 2px 0;border-radius:10px;" +
    "font-size:10px;font-weight:600;line-height:1.4;" +
    "background:" + color + "22;color:" + color + ";border:1px solid " + color + "44;";
  return pill;
}

function createPillRow(groups) {
  var row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;margin-top:4px;";
  var providers = Object.keys(groups);
  for (var i = 0; i < providers.length; i++) {
    var g = groups[providers[i]];
    var pill = createPill(providers[i], g.color);
    pill.title = g.params.join(", ");
    row.appendChild(pill);
  }
  return row;
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + "..." : str;
}

// ── Event listeners ──

document.body.addEventListener("mouseover", function (e) {
  var anchor = e.target.closest("a");
  if (anchor) showTooltip(anchor, e.clientX, e.clientY);
}, true);

document.body.addEventListener("mouseout", function (e) {
  var anchor = e.target.closest("a");
  if (anchor) hideTooltip();
}, true);

// ── Settings ──

chrome.storage.local.get("tooltipEnabled", function (result) {
  tooltipEnabled = result.tooltipEnabled !== false;
  if (!tooltipEnabled) unhighlightLinks();
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "local" && changes.tooltipEnabled) {
    tooltipEnabled = changes.tooltipEnabled.newValue !== false;
    if (tooltipEnabled) {
      highlightLinks();
    } else {
      hideTooltip();
      unhighlightLinks();
    }
  }
});

// ── Init ──

scanLinks();

window.addEventListener("pageshow", function (e) {
  if (e.persisted) sendResults();
});

var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var nodes = mutations[i].addedNodes;
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j];
      if (node.nodeType !== 1) continue;
      scanElement(node);
      var links = node.querySelectorAll ? node.querySelectorAll("a[href]") : [];
      for (var k = 0; k < links.length; k++) {
        scanElement(links[k]);
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
