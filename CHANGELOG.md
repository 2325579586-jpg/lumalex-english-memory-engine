# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Conventional Commits for commit messages.

## [Unreleased]

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
