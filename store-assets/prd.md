# wearelinked — Product Reference

## Overview
Browser extension that exposes hidden redirects and tracking tags in links — see the real destination before you click.

Every time you click a link, it might not go where you think. Sites wrap URLs through tracking servers, add invisible parameters to monitor your clicks, and hide the real destination behind redirect chains. wearelinked scans every link on the page and shows you what's really happening — which links are redirect wrappers (Google, Facebook, YouTube, Outlook), which have tracking tags (gclid, fbclid, utm_source, and 20+ others), and where they actually lead. Flagged links get a red underline right on the page. Hover any one for a tooltip breakdown. Open the popup for a full count.

## How it works
```
popup.html <-> popup.js <-> background.js <-> content.js
                              (storage)     (link scan + tooltip)
```

| Component | Chrome (MV3) | Firefox (MV2) |
|-----------|-------------|---------------|
| Content script | Scans all `<a>` elements for tracking params and redirect wrappers. MutationObserver catches dynamically added links. Hover tooltip shows real destination. Red underlines highlight flagged links. | Same, `browser.*` API |
| Background | Service worker, stores results in `chrome.storage.session`, updates badge, manages tooltip setting | Persistent background page, in-memory storage, `browser.*` promises |
| Popup | Verdict count + breakdown (redirects/tracking tags), domain context, tooltip toggle | Same, `browser.*` promises |

## Project structure

```
wearelinked/
├── chrome-extension/
│   ├── manifest.json      # MV3 manifest
│   ├── content.js         # Link scanner + redirect unwrapper + tooltip
│   ├── content.css        # Highlight style for flagged links
│   ├── background.js      # Badge updates, stores results per tab, settings
│   ├── popup.html         # Popup shell + tooltip toggle
│   ├── popup.js           # Renders verdict + breakdown
│   ├── styles.css         # Dark theme
│   └── icon{16,48,128}.png
├── firefox-extension/
│   ├── manifest.json      # MV2 manifest
│   ├── content.js         # Same scanner, browser.* API
│   ├── content.css        # Same highlight style
│   ├── background.js      # Persistent background page, in-memory storage
│   ├── popup.html
│   ├── popup.js           # Same UI, browser.* promises
│   ├── styles.css
│   └── icon{16,48,128}.png
├── store-assets/           # Icons, screenshots, submission packages
├── CLAUDE.md
└── README.md
```

## Design decisions

- Pure vanilla JS — zero dependencies, no build step
- Local-only — nothing leaves the browser
- Dark theme matching the weare____ design language
- Red underlines on flagged links via manifest-injected CSS (bypasses site CSP)
- Hover tooltip on flagged links showing real destination + stripped params
- Tooltip toggle in popup header — persisted to storage, updates content script in real-time
- MutationObserver catches links injected after page load
- Deduplication by href

## Known limitations

- URL shorteners (t.co, bit.ly, etc.) cannot be resolved locally — flagged but not unwrapped
- Redirect wrappers are pattern-matched against a bundled list, not dynamically discovered
- Tracking parameter list is static — new parameters require an update
- Sites using JavaScript click handlers instead of href-based tracking are not detected
