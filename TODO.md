# TODO

## Blockers / publish safety
- Frontend production build succeeds with `npm.cmd run build`.
- Backend syntax validation succeeds with `python -m py_compile backend/app.py`.
- No automated API/frontend test suite exists yet, so publish confidence still depends on manual smoke testing.

## Known issues
- Bundle size warning during `frontend` build (single JS chunk > 500 kB).
- Windows PowerShell execution policy may block `npm` (use `npm.cmd` in this repo).
- No automated test/lint scripts are currently configured.

## Next development plan
- Add code-splitting for dictionary + relations UI (dynamic import on demand) to reduce initial bundle size.
- Add lightweight automated checks:
  - `frontend`: `tsc -b` + (optional) lint
  - API: minimal unit tests for sync auth/token, word-relations response normalization, and deletions application logic
- Improve dictionary pipeline:
  - Validate shard schema at import time; add a small runtime guard in `DictionaryService`.
  - Add UI affordance to switch "prefer local / prefer offline dictionary / prefer AI".
- Sync reliability:
  - Add server-side rate limiting / payload size guardrails for `/sync/push`.
  - Add client-side retries/backoff and better "last sync" UI messaging.
- Study UX:
  - Add manual smoke coverage for AI relation-word cards and CET-4 translation lexicon flows before the next release push.
