# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Conventional Commits for commit messages.

## [Unreleased]

## [2026-07-16]

### Maintenance
- Reviewed repository activity since the 2026-07-09 maintenance run; no new source-level feature, bug fix, UI, data, or API commits were present.
- Restored Git access in the maintenance environment and fetched the latest remote branch state.
- Preserved and reviewed the queued 2026-07-04 maintenance notes before publication.

### Verified
- `cd frontend && npm.cmd run build`
- `python -m py_compile backend/app.py`

### Known issues
- Frontend production build still emits a Vite chunk-size warning because the main JavaScript chunk is 584.08 kB after minification.
- No automated API/frontend test suite exists yet, so release confidence still depends on build checks plus manual smoke coverage.
- The active maintenance branch and `origin/main` do not have a usable merge base; integrate through a reviewed reconciliation branch or PR instead of force-pushing `main`.

### Next development plan
- Reconcile the maintained application history with `origin/main` through a reviewed branch/PR.
- Split heavy frontend bundles, especially dictionary and study/detail surfaces, to remove the current Vite chunk-size warning.
- Add lightweight automated coverage around auth/demo session handling, duplicate-submit protection, and learn/review session restoration.

## [2026-07-04]

### Maintenance
- Reviewed repository activity since the 2026-06-26 maintenance run; no source-level feature, bug fix, UI, data, or API changes were detected after that run.
- Re-ran the standard local release checks to confirm the current codebase remains buildable.

### Verified
- `cd frontend && npm.cmd run build`
- `python -m py_compile backend/app.py`

### Known issues
- Frontend production build still emits a Vite chunk-size warning because the main JavaScript chunk is 584.08 kB after minification.
- Local Git publishing is blocked in this environment: `C:\Program Files\Git\mingw64\bin\git.exe` exits with Windows code `-1073741515`, and `git` is not available on `PATH`.
- No automated API/frontend test suite exists yet, so release confidence still depends on build checks plus manual smoke coverage.

### Next development plan
- Restore a working Git CLI in the maintenance environment, then inspect status and push any queued documentation or source changes.
- Split heavy frontend bundles, especially dictionary and study/detail surfaces, to remove the current Vite chunk-size warning.
- Add lightweight automated coverage around auth/demo session handling, duplicate-submit protection, and learn/review session restoration.

## [2026-06-19]

### Added
- Local demo-account entry on the auth page so first-time visitors can open the app without creating a synced account.
- Exam-path landing cards in the library for junior high, high school, CET, and IELTS/TOEFL-oriented study entry.
- Release checklist under `docs/release-checklist.md` for local build, browser smoke, mobile layout, and Vercel verification.
- Product preview asset in `docs/assets/lumalex-product-preview.svg` for README and public project presentation.

### Changed
- README now presents LumaLex as a student-facing product with clearer target learners, study workflow, contribution direction, roadmap, and live-demo positioning.
- Review spelling and post-review spelling flows now use the new per-letter spelling input instead of a free-form field.
- Learn and review stores now guard against duplicate submit/postpone actions while async state is in flight.
- Learn-session restoration now preserves the learner's place more reliably when the word queue changes.
- Library landing UI now emphasizes exam goals, deck discovery, and concrete deck-creation suggestions instead of a plain management-first layout.
- Demo sessions are treated as local-only auth state so cloud-sync UI and token-dependent sync paths do not behave like a real online account.

### Fixed
- Removed garbled Chinese labels from the new letter-spelling input before release validation.
- Prevented repeated review/learn submissions from racing the local session state and causing double-advance behavior.

### Verified
- `cd frontend && npm.cmd run build`
- `python -m py_compile backend/app.py`
- Manual browser smoke: auth demo entry, library landing page, and review entry screen on desktop plus library layout on a 390px mobile viewport

### Known issues
- Frontend production build still emits a Vite chunk-size warning because the main bundle remains above 500 kB after minification.
- The new per-letter spelling UI is only build-validated so far; this run did not complete a full end-to-end spelling session with real due items.
- React Router v6 future-flag warnings still appear in local dev mode.

### Next development plan
- Run a real review/spelling round with seeded due items to verify the new per-letter spelling component through completion states.
- Split heavy frontend bundles, especially dictionary and study/detail surfaces, to remove the current Vite warning.
- Add lightweight automated coverage around auth/demo session handling, duplicate-submit protection, and learn/review session restoration.

## [2026-06-12]

### Added
- GitHub Actions frontend build workflow for pull requests and pushes to `main`.
- Pull request template with weekly goal, growth rationale, validation, risk, and rollback sections.
- Bug report and feature request issue templates to make external contributions easier to triage.
- Automatic post-review spelling follow-up so completed review rounds can continue directly into a focused spelling session.

### Changed
- README now highlights the live demo, current build checks, and contribution expectations.
- TODO now reflects that frontend build CI exists while lint/test/typecheck scripts remain future work.
- Review pronunciation playback now consistently replays the current word after spelling submissions instead of only under selected settings branches.
- Study detail, relation-word, and sentence lookup cards now use the same term-aware pronunciation path so saved dictionary terms prefer richer in-app audio metadata.
- AI word-relations normalization now rejects lookalike entries that are not single English words across the frontend cache layer, serverless API route, and Flask fallback backend.

### Fixed
- Prevented AI/generated lookalike groups from being padded with phrases, hyphenated forms, or sentence fragments that do not belong in spelling-confusion drills.
- Removed inconsistent pronunciation button behavior across related-word surfaces where plain text playback could ignore stored pronunciations.

### Known issues
- Frontend production build still emits a Vite chunk-size warning because the main bundle is larger than 500 kB after minification.
- No automated API/frontend test suite exists yet, so release confidence still depends on build checks plus manual smoke coverage.
- Windows PowerShell execution policy may still block `npm`; use `npm.cmd` for local frontend commands in this repo.

### Next development plan
- Split the heavy study and dictionary-related frontend code paths to reduce the initial bundle size and remove the current Vite warning.
- Add lightweight automated coverage for word-relations normalization, sync token enforcement, and spelling/review session transitions.
- Manually smoke test the post-review spelling handoff and relation-word pronunciation flow before the next main-branch release.

## [2026-06-05]

### Added
- AI-powered relation-word cards in study details, covering lookalikes, synonyms, antonyms, and derived expressions through the new `/api/word-relations` flow.
- Similar-looking word discovery from the local dictionary, plus one-tap add-to-deck actions for derived words during study.
- CET-4 translation phrase system lexicon support, including compact JSON normalization for seeded lexicon data.

### Changed
- Review and learn detail panels now pass definition/part-of-speech context into richer study helpers and relation-word lookups.
- System lexicon item APIs now return lexicon metadata together with item lists for both path-based and query-based requests.
- AI enrichment now rejects low-value fallback meanings/examples instead of silently returning generic placeholder content.

### Fixed
- Corrected garbled Chinese copy in the new relation-word UI/API path before release validation.
- Session payloads now include a derived `syncToken` signature for stricter sync authorization checks.

## [2026-05-29]

### Added
- Shared study text helpers (`frontend/src/lib/study-text.ts`) for spelling-answer normalization and responsive title sizing.

### Changed
- Learn/Review term titles now use consistent `clamp()`-based sizing (improves long phrases + mixed punctuation display).
- Today learn queue prioritizes `learning` items first, then sorts by `lastStudiedAt`/`createdAt`.

### Fixed
- Spelling flow replays pronunciation after empty-submit or incorrect answers, and avoids unhandled promise rejections in autoplay.

## [2026-05-17]

### Added
- Offline-friendly dictionary lookup (sharded JSON under `frontend/public/dictionary`) with a small embedded fallback dictionary.
- Word relations panel in learning/review flows (derived forms, roots, collocations, synonyms, antonyms, example) with one-tap “add to library”.
- Enrichment pipeline now returns structured derived forms (`wordForms`) plus synonyms/antonyms when available.
- Sync deletion support (`deletions` collection) and broader timestamp detection for more reliable conflict resolution.
- Sync authorization hardening with a session-linked `syncToken` for push/pull calls.
- Dictionary import script (`scripts/import-dict.mjs`) + import report artifacts.

### Changed
- Add-words flow supports derived forms as structured items (pos + optional meaning) and merges AI/dictionary enrichment more safely.
- Global topbar search can surface dictionary entries (not just local library items).

### Fixed
- Local-user sync now remaps user-scoped IDs when attaching local data to a cloud account, reducing accidental cross-user collisions.

### Known issues
- Frontend production bundle triggers Vite’s “> 500 kB chunk” warning; consider code splitting the word relations panel and dictionary shards.
