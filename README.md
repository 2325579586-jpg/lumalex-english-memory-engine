# LumaLex: Build Your English Memory Engine

LumaLex is a memory-first English learning system for learners who want more than a word list. It combines spaced review, cross-device sync, pronunciation practice, spelling checks, example-sentence drills, and a quiet mobile-friendly interface into one focused vocabulary workflow.

The product idea is simple: learn a word once, then let the system keep bringing it back in the right mode until it actually sticks.

## Highlights

- Five real review modes: English to Chinese, Chinese to English, listening comprehension, spelling review, and sentence cloze.
- Memory scheduling: review results update strength, wrong counts, focus status, and next review time.
- Cross-device account sync: vocabulary, learning history, review progress, settings, and active sessions can follow the same account.
- Pronunciation workflow: switch between US and UK accents and replay from the phonetic area.
- Example-based learning: clickable words inside example sentences can be quickly added to a deck.
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

Build the production frontend:

```bash
cd frontend
npm run build
```

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
