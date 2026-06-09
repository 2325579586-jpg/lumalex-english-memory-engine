# LumaLex: Build Your English Memory Engine

LumaLex is a memory-first English learning system for learners who want more than a word list. It combines spaced review, cross-device sync, pronunciation practice, spelling checks, example-sentence drills, and a quiet mobile-friendly interface into one focused vocabulary workflow.

The product idea is simple: learn a word once, then let the system keep bringing it back in the right mode until it actually sticks.

## Highlights

- Live demo: https://worldapp-livid.vercel.app
- Five real review modes: English to Chinese, Chinese to English, listening comprehension, spelling review, and sentence cloze.
- Memory scheduling: review results update strength, wrong counts, focus status, and next review time.
- Cross-device account sync: vocabulary, learning history, review progress, settings, and active sessions can follow the same account.
- Offline-friendly dictionary: fast local lookup backed by a sharded built-in dictionary, plus optional AI completion.
- AI relation-word explorer: fetches lookalikes, synonyms, antonyms, and derived expressions inside study detail views.
- Pronunciation workflow: switch between US and UK accents and replay from the phonetic area.
- Example-based learning: clickable words inside example sentences can be quickly added to a deck.
- Word relations panel: derived forms, roots, collocations, synonyms/antonyms, and example recall helpers during study.
- System lexicons: built-in CET-4, CET-4 translation phrases, and CET-6 collections can be seeded for guided study.
- Local-first frontend: IndexedDB keeps the app responsive, while cloud sync keeps devices aligned.
- Mobile-focused UI: compact review cards, bottom navigation, and large touch targets for phone use.

## Reading Module

The reading experience is designed around active recall rather than passive scrolling.

- The learner first sees a prompt, audio cue, spelling prompt, or cloze sentence.
- The answer stays hidden until the learner makes a judgment or checks an input.
- Feedback is recorded as remembered, hesitant, or forgot.
- Hard words stay in the active loop; mastered words are scheduled farther out.
- Example sentences provide context and let users collect unknown words directly into their library.

This makes LumaLex useful as a daily reading companion: any unfamiliar word from a sentence can become a reviewed item with pronunciation, meaning, and future recall built in.

## Review Modes

| Mode | What the learner does |
| --- | --- |
| English to Chinese | See the English word and recall the Chinese meaning. |
| Chinese to English | See the Chinese meaning and recall the English word. |
| Listening Comprehension | Hear the word first, then recall its meaning before revealing the answer. |
| Spelling Review | Type the English word from its Chinese meaning. |
| Sentence Cloze | Fill the missing word inside an example sentence. |

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, Dexie
- API: Vercel serverless functions
- Database: Neon Postgres
- Optional local backend: Flask for legacy/local workflows

## Project Structure

```text
api/                 Vercel serverless API routes
backend/             Optional Flask backend and system lexicon tools
frontend/            React + Vite application
scripts/             Data seeding and maintenance scripts
vercel.json          Vercel deployment configuration
```

## Getting Started

Install root API dependencies:

```bash
npm install
```

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

On Windows PowerShell, `npm` may be blocked by execution policy; use `npm.cmd` instead.

Build the production frontend:

```bash
cd frontend
npm.cmd run build
```

## Development Checks

The repository includes a GitHub Actions workflow that runs the current production frontend build on pushes and pull requests to `main`.

Current local checks:

```bash
npm install
cd frontend
npm install
npm run build
```

Lint, test, and standalone typecheck scripts are not configured yet; see `TODO.md` for the next stability improvements.

## Contributing

Focused pull requests are welcome. The most useful contributions are small improvements to review UX, offline dictionary behavior, sync reliability, documentation, and build confidence.

- Use the GitHub issue templates for reproducible bugs or focused feature requests.
- Use the PR template to describe the weekly/product goal, checks run, risks, and rollback path.
- Do not commit secrets, private vocabulary files, local database dumps, or raw PDF word sources.
- Good first contribution candidates are listed in `TODO.md`.

## Environment

Create local environment files from your own credentials. Do not commit real secrets.

Common server variables:

```env
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...
```

Frontend development can point to a deployed API:

```env
VITE_API_BASE=https://your-domain.example/api
```

## Deployment

The repository is configured for Vercel:

- root install: `npm install && cd frontend && npm install`
- build command: `cd frontend && npm run build`
- output directory: `frontend/dist`

Set database credentials in the hosting provider's environment variable panel before deploying.

## Safety Notes

This public repository intentionally excludes:

- `.env*` files with database credentials or tokens
- Vercel local metadata
- `node_modules`
- build outputs
- local databases and logs
- PDF vocabulary source files

## License

MIT
