# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Conventional Commits for commit messages.

## [Unreleased]

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

