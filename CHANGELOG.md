# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Conventional Commits for commit messages.

## [Unreleased]

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
