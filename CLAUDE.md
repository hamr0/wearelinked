## Dev Rules

**POC first.** Always validate logic with a ~15min proof-of-concept before building. Cover happy path + common edges. POC works → design properly → build with tests. Never ship the POC.

**Build incrementally.** Break work into small independent modules. One piece at a time, each must work on its own before integrating.

**Dependency hierarchy — follow strictly:** vanilla language → standard library → external (only when stdlib can't do it in <100 lines). External deps must be maintained, lightweight, and widely adopted. Exception: always use vetted libraries for security-critical code (crypto, auth, sanitization).

**Lightweight over complex.** Fewer moving parts, fewer deps, less config. Simple > clever. Readable > elegant.

**Open-source only.** No vendor lock-in. Every line of code must have a purpose — no speculative code, no premature abstractions.

## Project Context

**wearelinked** is a browser extension (Chrome MV3 + Firefox MV2) that exposes redirect chains and tracking parameters in links. Hover any link to see where it really goes. Part of the "weare____" privacy tool series.

- Pure vanilla JS, zero dependencies, no build step
- Local-only — no data leaves the browser
- Uses `browser.*` API for Firefox, `chrome.*` for Chrome
- Dark theme matching the wearecooked/wearebaked design language
