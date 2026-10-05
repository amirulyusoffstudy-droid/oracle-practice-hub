# Oracle Practice Hub — Build Status

This file is the durable handoff for continuing development module by module.

## Definition of done

- Four sets (A-D), exactly 72 questions each.
- Single-set and Smart Mixed attempts; a 72-question balanced mix uses 18 per set.
- Deterministic question and safe option shuffling.
- Practice, Exam, and Review experiences.
- Exact-match scoring for multiple-answer questions.
- Timer, flagging, autosave/resume, results, topic/set breakdown, and local attempt history.
- Responsive and keyboard-accessible UI.
- Unit tests, typecheck, lint, production build, and browser smoke flow pass.

## Module checkpoints

### M1 — Project and question bank: COMPLETE

- React 19 + TypeScript + Vite project created.
- Vitest and ESLint installed.
- Set A-D normalized into `src/data/generated/`.
- Verified 72 questions per set and 288 globally unique question IDs.

### M2 — Exam engine: COMPLETE

- Seeded deterministic shuffle.
- Topic-balanced selection.
- Balanced Smart Mixed selection (18 questions per set for a 72-question attempt).
- Recent-question avoidance and priority-question support.
- Safe option shuffling with stable option IDs.
- Exact-match scoring plus topic/set breakdown.
- Engine coverage remains green within the latest full result: 3 test files, 11 tests passed.

### M3 — Persistence: COMPLETE

- Active-attempt save/load/clear implemented in `src/domain/attemptStore.ts`.
- Invalid or corrupted stored attempts are rejected safely.
- Attempt history is newest-first, deduplicated by ID, and capped at 30 entries.
- Verified: 3 test files and 11 tests passed; TypeScript build check and ESLint passed.

### M4 — App state and attempt lifecycle: COMPLETE

- Deterministic attempt creation implemented in `src/domain/attemptLifecycle.ts`.
- Immutable response updates, flag toggling, bounded navigation, and timer calculation implemented.
- Submission is one-way and returns exact-match scoring.
- Per-question correct/incorrect/unanswered history persists for Smart Mixed priority.
- `src/domain/attemptSession.ts` autosaves start, answer, flag, and navigation changes; submission writes history/performance and clears the active attempt.
- Verified: 6 test files and 23 tests passed; TypeScript build check and ESLint passed.

### M5 — Dashboard and exam setup UI: COMPLETE

- Dashboard summary, resume card, mode/source/count setup, and deterministic attempt start implemented.
- Verified within the latest full result: 7 test files and 29 tests passed; ESLint and production build passed.

### M6 — Question runner UI: COMPLETE

- Single/multiple response controls, autosave, navigator, flagging, previous/next actions implemented.
- Practice feedback/explanations, exam timer, and submit confirmation implemented.
- Real browser screenshot confirmed the runner, answer selection, question navigation, and practice feedback render correctly.
- Verified: targeted App suite 6/6 passed; full suite 7 files and 29 tests passed; ESLint passed; production build transformed 27 modules successfully.

### M7 — Results, review, and history UI: COMPLETE

- Detailed submitted-results screen implemented in `src/components/AttemptResults.tsx`.
- Overall score, correct/incorrect/unanswered totals, and set/topic breakdowns implemented.
- Immediate question review shows the user's answer, correct answer, explanation, outcome, and flagged state.
- Review filters implemented for all, incorrect, unanswered, and flagged questions.
- Dashboard attempt history is newest-first and refreshes immediately after returning from results.
- `Topics to revisit` aggregates incorrect and unanswered performance by canonical topic.
- Real browser verification confirmed a 100% 2-question attempt, a deliberate 0% attempt, newest-first history, and `Quotas` at 50% with one answer to revisit.

### M8 — Quality gates and structured content formatting: COMPLETE

- Added `src/components/QuestionContent.tsx` and `src/components/questionFormatting.ts` for safe React-node rendering without `dangerouslySetInnerHTML`.
- SQL/query/command content is visually separated from prose in responsive monospace blocks; Oracle errors such as `ORA-01536` use a distinct inline error style.
- Structured formatting is used in both the question runner and submitted-attempt review.
- Eleven canonical Set D stems with unambiguous query/command boundaries are formatted; ordinary prose remains a safe fallback and literal content is preserved.
- SQL answer options use conservative case-sensitive detection so sentence-case prose such as `Grant a quota on USERS` is not misclassified.
- Full verification: 8 test files and 37 tests passed; ESLint passed with 0 errors and 0 warnings; TypeScript/Vite production build passed with 31 modules transformed.
- Browser smoke used isolated origin `http://127.0.0.1:5175/` and an isolated Brave profile, preserving user state on ports 5173 and 5174.
- Real browser flow passed: resume, exact-match answer selection, flag, navigate, refresh/resume, submit confirmation, results, all/flagged/incorrect review filters, dashboard return, history, and weak-topic refresh.
- Mobile verification passed at 390x844: single-column runner, vertical actions, static navigator, readable error/answer content, and no page-level horizontal overflow.
- Keyboard verification passed: Space selected and persisted a radio answer; OS-level Enter toggled and persisted the focused Flag button; visible focus styling was present.
- Final browser screenshots are stored under the Senku profile cache, including `computer_use_4db7cfe981974193b5560ad44b7d5a06.png`, `computer_use_e1b40ad72d7f4c45a136d39fa641736c.png`, `computer_use_10fb702a1d214e80abb4fa134360c321.png`, and `m8-mobile-format.png`.

### M9 — Installable offline/PWA hardening: COMPLETE

- Added `public/manifest.webmanifest` with standalone display metadata, local scope/start URL, theme colours, and an SVG application icon.
- Added dependency-free `public/sw.js` with app-shell and hashed production-asset precaching, same-origin runtime caching, navigation fallback, immediate activation, and stale-cache cleanup.
- Added production-only, base-path-aware registration in `src/pwa.ts` and `src/main.tsx`; development and unsupported-browser paths remain no-ops.
- TDD evidence: registration contract reached an intended RED assertion, then 2 targeted tests passed.
- Full verification after implementation: 9 test files and 39 tests passed; ESLint passed; TypeScript/Vite production build passed with 32 modules transformed.
- Production preview at isolated origin `http://127.0.0.1:5186/` was controlled by the service worker and cached HTML, manifest, icon, hashed CSS, and hashed JavaScript in `oracle-practice-hub-v1`.
- Genuine DevTools offline hard reload passed: `navigator.onLine` was false while the document reached `complete`, the app heading/root/setup form rendered, and one script plus one stylesheet loaded from cache.
- Network was restored and read back as online; the production page remained rendered and service-worker controlled.

## Final status

- Modules M1-M9 are complete and verified.
- M10 — Runner navigation, GitHub publication, and Vercel deployment: IN PROGRESS.
- Runner Home navigation is implemented and verified: it returns to the dashboard while preserving the autosaved active attempt for resume.
- Navigation verification: targeted TDD test passed; full suite passed with 9 files and 40 tests; ESLint and production build passed with 32 modules transformed.
- Local Git repository is initialized on `main`; public GitHub destination is `amirulyusoffstudy-droid/oracle-practice-hub`.
- Pre-commit scan found no secrets or forbidden tracked files; two scanner hits were reviewed as safe false positives (`RegExp.exec` and documentation stating `dangerouslySetInnerHTML` is not used).
- Current exact action: create and push the verified public GitHub repository, then authenticate and deploy the production build to Vercel as `oracle-082`.
- The app remains local-first with no backend, login, analytics, deployment, or external data sink.
- No deployment, publication, commit, or push has been performed yet.

## Safety and scope

- Local-first only; no backend, account, analytics, deployment, or external data sink.
- Source files under `ORACLE EXAM` and the Raph cache remain unchanged.
- No push, deployment, or publication without explicit approval.
