# wearelinked

**See where links really go before you click.**

> **Short description:** Browser extension that exposes hidden redirects and tracking tags in links — see the real destination before you click.

> **Long description:** Every time you click a link, it might not go where you think. Sites wrap URLs through tracking servers, add invisible parameters to monitor your clicks, and hide the real destination behind redirect chains. wearelinked scans every link on the page and shows you what's really happening — which links are redirect wrappers (Google, Facebook, YouTube, Outlook), which have tracking tags (gclid, fbclid, utm_source, and 20+ others), and where they actually lead. Flagged links get a red underline right on the page. Hover any one for a tooltip breakdown. Open the popup for a full count. Everything runs locally in your browser — no data is collected, transmitted, or shared. Zero dependencies, open source, no account required.

wearelinked exposes redirect chains and strips tracking parameters from links. Hover any link to see the real destination — unwrapped from Google, Facebook, YouTube, and Outlook redirect wrappers, with utm_source, fbclid, gclid, msclkid and 20+ other tracking decorations removed. Open the popup for a breakdown of every flagged link on the page. Everything runs in your browser. No data is collected, transmitted, or shared.

Part of the **weare____** privacy tool series.

## What it detects

- **Redirect wrappers** — intermediary URLs that route you through a tracker before reaching the real destination. Google search results, Facebook outbound links, YouTube redirects, and Outlook SafeLinks all wrap the actual URL so the platform can log your click. wearelinked unwraps them and shows you where you're actually going.
- **URL shorteners** — t.co, bit.ly, tinyurl.com, ow.ly, goo.gl. These hide the real destination and let the shortener service track every click. Flagged as shorteners since they can't be resolved locally.
- **Tracking parameters** — query string decorations added to URLs purely for tracking: `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`, `dclid`, `msclkid`, `_ga`, `_gl`, `_hsenc`, `twclid`, `ttclid`, `li_fat_id`, `igshid`, and more. These tell the destination site which ad, email, or social post brought you there.
- **Mail redirects** — click.redditmail.com and similar email tracking redirects that log whether you clicked a link in a notification email.

## Install

### Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `chrome-extension/`

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `firefox-extension/manifest.json`

## How it works

```
popup.html ←→ popup.js ←→ background.js ←→ content.js
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

## Design

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

## License

Open source. Part of the weare____ series.


---

## The weare____ Suite

Privacy tools that show what's happening — no cloud, no accounts, nothing leaves your browser.

| Extension | What it exposes |
|-----------|----------------|
| [wearecooked](https://github.com/hamr0/wearecooked) | Cookies, tracking pixels, and beacons |
| [wearebaked](https://github.com/hamr0/wearebaked) | Network requests, third-party scripts, and data brokers |
| [weareleaking](https://github.com/hamr0/weareleaking) | localStorage and sessionStorage tracking data |
| [wearelinked](https://github.com/hamr0/wearelinked) | Redirect chains and tracking parameters in links |
| [wearewatched](https://github.com/hamr0/wearewatched) | Browser fingerprinting and silent permission access |
| [weareplayed](https://github.com/hamr0/weareplayed) | Dark patterns: fake urgency, confirm-shaming, pre-checked boxes |
| [wearetosed](https://github.com/hamr0/wearetosed) | Toxic clauses in privacy policies and terms of service |
| [wearesilent](https://github.com/hamr0/wearesilent) | Form input exfiltration before you click submit |

All extensions run entirely on your device and work on Chrome and Firefox.
