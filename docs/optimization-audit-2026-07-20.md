# Full-stack optimization audit — 2026-07-20

This report records the baseline findings, implemented remediation, compatibility strategy, and verification coverage for the July 2026 hardening pass.

## Frontend findings and remediation

| Finding | Risk | Remediation |
| --- | --- | --- |
| Every page and heavy dictionary flow shipped in one 584.08 kB JS chunk (179.60 kB gzip). | Slow first load and parse time on student phones. | Added authenticated-shell, route, dictionary, add-word, and auth code splitting. The main entry is now 191.87 kB (63.41 kB gzip), with no large-chunk warning. |
| `react-router-dom` resolved to a version affected by an open-redirect advisory; Vite/Babel tooling also had current advisories. | Supply-chain and development-server exposure. | Upgraded to React Router 6.30.4, Vite 7.3.6, React plugin 5.1.4, and Babel 7.29.7. `npm audit` reports zero vulnerabilities. |
| IndexedDB repositories repeatedly loaded all users' words and then filtered in memory. Sync did the same across six tables. | Increasing CPU, memory, and latency as a library grows. | Replaced full scans with indexed `userId` and compound `[userId+status]` queries; bulk updates now run in a single Dexie transaction. |
| The authenticated shell combined `min-h-screen`, nested scrolling, and a fixed-height sidebar. | Double-scroll behavior and mobile browser viewport bugs. | Switched to a single `100dvh` shell, `min-h-0` scroll ownership, a full-height scrollable desktop sidebar, and safe bottom padding. |
| Long review prompts could be forced to `whitespace-nowrap`. | Clipped or horizontally overflowing long words on narrow screens. | Added safe word wrapping and `overflow-wrap:anywhere`. |
| Loading states lacked status semantics; auth labels were not associated with controls; unknown routes silently redirected. | Keyboard and screen-reader friction, confusing dead ends. | Added live status/alert semantics, semantic auth form submission, associated labels, autocomplete hints, a skip link, and a helpful 404 page. |
| Google Fonts loaded from CSS and the dashboard fetched an unrelated remote placeholder image. | Extra render blocking, privacy cost, and unstable visual dependency. | Moved font loading to preconnected document links and replaced the remote image with local gradients. |
| Metadata, favicon, reduced-motion support, and browser security policy were incomplete. | Weak sharing/accessibility and a larger XSS/clickjacking blast radius. | Added metadata, local favicon/share artwork, reduced-motion behavior, CSP, HSTS, permissions policy, frame denial, and content-type protection. |
| The legacy static fallback interpolated custom lexicon names/items into `innerHTML`. | Stored DOM XSS when untrusted legacy lexicon content was rendered. | Escaped every dynamic lexicon attribute/text value that enters the remaining legacy markup path and documented the fallback as local-only compatibility code. |

## Node API findings and remediation

| Finding | Risk | Remediation |
| --- | --- | --- |
| Passwords used unsalted SHA-256. | Fast offline cracking after a database leak. | New passwords use salted scrypt; legacy hashes are detected with constant-time comparison and upgraded on successful login. |
| Sync tokens were deterministic hashes of user ID and password hash and could not be revoked. | Database leakage created reusable tokens; logout had no server effect. | Added random opaque sessions, hashed token storage, 30-day expiry, per-user session caps, verification, and logout revocation. |
| JSON parsing silently converted malformed bodies to `{}` and had no body limit. | Ambiguous errors and memory/CPU abuse. | Added strict object parsing, 400/413 responses, endpoint-specific limits, and content-length/stream enforcement. |
| CORS allowed every origin. | Cross-origin API abuse and token exposure amplification. | Changed to same-origin plus explicit `CORS_ALLOWED_ORIGINS`, with denied preflight responses. |
| Auth and paid AI routes had no throttling. | Password guessing and uncontrolled provider spend. | Added bounded per-instance rate limiting and `Retry-After` responses. |
| External dictionary/LLM requests had no Node timeout. | Serverless functions could hang until platform termination. | Added abortable 12–30 second provider timeouts. |
| Relation-word cache grew without limit. | Warm-instance memory growth. | Added a 250-entry, 30-minute LRU-style cache. |
| Sync accepted unlimited items, oversized records, and generated random IDs for malformed data. | DoS, duplicate records, and non-idempotent retries. | Limited requests to 50 items/1 MB, capped records, rejected missing IDs, and validated cursors/tokens. |
| Normal sync writes performed multiple reads before every upsert. | Excess database round trips and contention. | Replaced preflight reads with conditional UPSERT/`NOT EXISTS` logic while preserving last-write and tombstone semantics. |
| Raw exception messages and stack-relevant provider/database details reached clients. | Internal infrastructure disclosure. | Centralized generic 5xx responses while retaining structured server logs. |

## Flask findings and remediation

| Finding | Risk | Remediation |
| --- | --- | --- |
| `/api/sync/push` and `/api/sync/pull` trusted any supplied `userId`; no token was checked. | Complete cross-account read/write if the optional backend was reachable on a LAN. | Added the same revocable session model and mandatory sync verification used by production. |
| Flask still used SHA-256 passwords and deterministic tokens. | Same credential and replay risks as production. | Added the same salted scrypt format as Node, legacy upgrade, opaque sessions, expiry, caps, and logout. |
| Pull loaded all records with no pagination; push accepted unbounded data. | Memory and latency growth. | Added stable cursor pagination, page limits, payload limits, record limits, and deletion tombstone handling. |
| Naive UTC datetimes were converted with local-time `.timestamp()` semantics. | Eight-hour timestamp drift in Asia/Shanghai could resurrect stale records or misorder sync pages. | Added explicit UTC epoch conversion and regression coverage. |
| Lexicon counts loaded every item row into Python. | Avoidable database and application memory work. | Replaced row materialization with grouped `COUNT()` queries. |
| CORS was wildcarded and health/AI errors exposed operational details. | Broader attack surface and information disclosure. | Added origin allowlisting, security headers, API error normalization, and reduced health/error detail. |
| Flask, Requests, python-dotenv, urllib3, and Click pins had eight known advisories. | Credential forwarding, sensitive caching, decompression resource use, local command/symlink risks. | Upgraded to the first fully fixed compatible versions and added dependency auditing to the release verification. |

## Structure and delivery changes

- Added `docs/architecture.md` to make production, optional Flask, shared data, and legacy-static boundaries explicit.
- Added root `check`, API syntax, Node unit-test, Python integration-test, and frontend typecheck scripts.
- Expanded CI from a frontend-only build to dependency install, API syntax, Node tests, Flask tests, and production frontend build.
- Standardized Vercel installs on `npm ci` and aligned root/subdirectory security and caching headers.

## Compatibility and verification

Existing route paths, IndexedDB schema, sync collection names, system lexicon data, study/review scheduling, custom decks, settings, and demo mode remain unchanged. Existing local SHA-256 accounts can migrate once; existing six- or seven-character passwords can still log in and are upgraded, while new registrations require eight characters.

Automated coverage now verifies:

- salted password hashing and legacy verification;
- stable sync IDs and timestamp guards;
- Flask authentication enforcement and logout revocation;
- deletion tombstones blocking stale restores;
- legacy account migration and password upgrade;
- TypeScript/Vite production compilation and all Node API syntax.

This pass also exercised the auth page, demo entry, dashboard, and library route in a real Chromium session. Desktop and 390 x 844 mobile layouts rendered without a framework error overlay, page error, or horizontal overflow; route-level lazy chunks loaded successfully.

Browser-level study-flow checks remain part of `docs/release-checklist.md`; they require an interactive browser and representative local data.
