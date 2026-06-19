# LumaLex Release Checklist

Use this checklist before saying a change is live on Vercel.

## Local Confidence

- [ ] `cd frontend && npm.cmd run build` passes on Windows.
- [ ] `git diff --check` passes for the touched files.
- [ ] Existing unrelated worktree changes are identified and not reverted.
- [ ] The change supports the vocabulary-learning direction for students or exam learners.

## Desktop Review

- [ ] Check the changed flow at desktop width, ideally 1280px or wider.
- [ ] Text does not wrap awkwardly inside buttons, cards, tables, or headers.
- [ ] Primary actions are obvious without reading explanatory copy.
- [ ] Study, review, library, or auth changes preserve keyboard-friendly controls.

## Mobile Review

- [ ] Check the changed flow at phone width, ideally 390px wide.
- [ ] Bottom navigation, fixed footers, and primary actions do not overlap content.
- [ ] Cards, tables, filters, and forms collapse without horizontal overflow.
- [ ] Touch targets remain large enough for repeated student use.

## Vercel Deployment

- [ ] Commit the intended changes.
- [ ] Push the branch that Vercel deploys, or run the approved Vercel deployment command.
- [ ] Confirm the deployed URL loads the new content.
- [ ] Fetch the deployed bundle or inspect the live page for a unique string from the change.
- [ ] Only then report the change as live.

## Growth Check

- [ ] The change helps at least one target group: middle school, high school, university, CET, IELTS, TOEFL, or self-directed readers.
- [ ] The user can understand the value faster than before.
- [ ] The change gives a clearer reason to return, share, contribute, or star the repository.
