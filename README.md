# Oracle Practice Hub

A local-first, installable practice application for Oracle Database Administration I (`1Z0-082`). Built with React, TypeScript, and Vite.

## Features

- Four reviewed question sets with 72 questions each (288 total)
- Practice, exam, review, and balanced Smart Mixed modes
- Deterministic question and answer-option shuffling
- Exact-match scoring for multiple-answer questions
- Autosave, resume, timer, flagging, and question navigation
- Detailed results, explanations, attempt history, and weak-topic summaries
- Structured monospace formatting for SQL, commands, and Oracle errors
- Responsive and keyboard-accessible interface
- Installable PWA with verified offline reload support
- Browser-only persistence; no backend, login, analytics, or external data sink

## Local development

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

Latest verified baseline: 9 test files and 40 tests passed, ESLint passed, and the production build completed successfully.

## Production preview

```bash
npm run build
npm exec vite -- preview
```

## Disclaimer

Independent practice material. This project is not affiliated with or endorsed by Oracle Corporation. Oracle and Java are registered trademarks of Oracle and/or its affiliates.
