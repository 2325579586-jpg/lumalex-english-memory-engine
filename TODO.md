# TODO

## Blockers / publish safety
- Frontend production build succeeds locally with `npm.cmd run build` and is covered by GitHub Actions on pull requests.
- No automated API/frontend test suite exists yet, so publish confidence still depends on build CI plus manual smoke testing.

## Known issues
- Bundle size warning during `frontend` build (single JS chunk > 500 kB).
- Windows PowerShell execution policy may block `npm` (use `npm.cmd` in this repo).
- No automated test/lint scripts are currently configured, and `typecheck` is only covered through `frontend` build.

## Next development plan
- Add code-splitting for dictionary + relations UI (dynamic import on demand) to reduce initial bundle size.
- Add lightweight automated checks:
  - `frontend`: expose `tsc -b` as a standalone `typecheck` script + add optional lint
  - API: minimal unit tests for sync auth/token, word-relations response normalization, and deletions application logic
- Improve dictionary pipeline:
  - Validate shard schema at import time; add a small runtime guard in `DictionaryService`.
  - Add UI affordance to switch “prefer local / prefer offline dictionary / prefer AI”.
- Sync reliability:
  - Add server-side rate limiting / payload size guardrails for `/sync/push`.
  - Add client-side retries/backoff and better “last sync” UI messaging.

