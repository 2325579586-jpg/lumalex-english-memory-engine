# TODO

## Blockers / publish safety
- Frontend production build succeeds locally with `npm.cmd run build` and is covered by GitHub Actions on pull requests.
- Backend syntax validation succeeds with `python -m py_compile backend/app.py`.
- Git access was restored for the 2026-07-16 maintenance run; the queued documentation can be committed and pushed to the existing maintenance branch.
- The active maintenance branch and `origin/main` have no usable merge base, so publishing these application changes to `main` requires a reviewed reconciliation branch/PR rather than a force push.
- No automated API/frontend test suite exists yet, so publish confidence still depends on build CI plus manual smoke testing.
- Current maintenance branch has browser smoke coverage for auth demo entry, library landing, and review entry, but not for a full spelling/review completion cycle with seeded due words.

## Known issues
- Bundle size warning during `frontend` build (single JS chunk > 500 kB).
- Windows PowerShell execution policy may block `npm` (use `npm.cmd` in this repo).
- No automated test/lint scripts are currently configured, and `typecheck` is only covered through `frontend` build.
- New per-letter spelling input is only partially smoke-tested so far; there is still no full end-to-end UI coverage for review completion -> spelling handoff.
- React Router future-flag warnings still appear in local dev mode.

## Next development plan
- Reconcile the maintained application history with `origin/main` through a reviewed branch/PR without rewriting the remote default branch.
- Add code-splitting for dictionary + relations UI (dynamic import on demand) to reduce initial bundle size.
- Add lightweight automated checks:
  - `frontend`: expose `tsc -b` as a standalone `typecheck` script + add optional lint
  - API: minimal unit tests for sync auth/token, word-relations response normalization, and deletions application logic
- Add a manual smoke checklist or browser automation for:
  - review completion -> post-round spelling session
  - per-letter spelling completion, retry, and clear states
  - relation-word pronunciation buttons across study detail, sentence lookup, and AI relation cards
- Improve dictionary pipeline:
  - Validate shard schema at import time; add a small runtime guard in `DictionaryService`.
  - Add UI affordance to switch "prefer local / prefer offline dictionary / prefer AI".
- Sync reliability:
  - Add server-side rate limiting / payload size guardrails for `/sync/push`.
  - Add client-side retries/backoff and better "last sync" UI messaging.
- Study UX:
  - Add manual smoke coverage for AI relation-word cards and CET-4 translation lexicon flows before the next release push.
