"use strict";

// ── Tracking parameters ──

var TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "dclid", "msclkid", "mc_eid", "mc_cid",
  "_ga", "_gl", "_hsenc", "_hsmi", "_openstat",
  "yclid", "twclid", "ttclid", "li_fat_id", "igshid",
  "ref_src", "ref_url"
];

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

  browser.runtime.sendMessage({
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
  var html = "";

  if (item.isRedirectWrapper) {
    html += '<div style="color:#e74c3c;font-weight:600;margin-bottom:4px">' +
      escapeHtml(item.wrapperName) + ' redirect</div>';
    if (item.unwrappedUrl) {
      html += '<div style="color:#888;font-size:11px">Real destination:</div>' +
        '<div style="color:#6bc5e7;font-family:monospace;font-size:11px;margin-bottom:6px">' +
        escapeHtml(getDomain(item.unwrappedUrl)) + '</div>';
    } else {
      html += '<div style="color:#888;font-size:11px;margin-bottom:6px">Cannot resolve locally</div>';
    }
  }

  if (item.trackingParams.length > 0) {
    if (!item.isRedirectWrapper) {
      html += '<div style="color:#e0a458;font-weight:600;margin-bottom:4px">This link is tracking your click</div>';
    }
    html += '<div style="color:#e0a458;font-weight:600">' +
      item.trackingParams.length + ' tracking tag' +
      (item.trackingParams.length !== 1 ? 's' : '') + ' on this link</div>' +
      '<div style="color:#666;font-size:11px">' +
      escapeHtml(item.trackingParams.join(", ")) + '</div>';
  }

  html += '<div style="color:#4a9;font-family:monospace;font-size:11px;margin-top:6px;border-top:1px solid #2a2a4a;padding-top:6px">' +
    escapeHtml(truncate(item.cleanHref, 120)) + '</div>';

  tip.innerHTML = html;
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

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

browser.storage.local.get("tooltipEnabled").then(function (result) {
  tooltipEnabled = result.tooltipEnabled !== false;
  if (!tooltipEnabled) unhighlightLinks();
});

browser.storage.onChanged.addListener(function (changes, area) {
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
