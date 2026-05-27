# TODO

## Blockers / publish safety
- None (frontend build currently succeeds with `npm.cmd run build`).

## Known issues
- Bundle size warning during `frontend` build (single JS chunk > 500 kB).
- Windows PowerShell execution policy may block `npm` (use `npm.cmd` in this repo).

## Next development plan
- Add code-splitting for dictionary + relations UI (dynamic import on demand) to reduce initial bundle size.
- Add lightweight automated checks:
  - `frontend`: lint (if adopted) + `tsc -b`
  - API: minimal unit tests for sync auth/token + deletions application logic
- Improve dictionary pipeline:
  - Validate shard schema at import time; add a small runtime guard in `DictionaryService`.
  - Add UI affordance to switch “prefer local / prefer offline dictionary / prefer AI”.
- Sync reliability:
  - Add server-side rate limiting / payload size guardrails for `/sync/push`.
  - Add client-side retries/backoff and better “last sync” UI messaging.

