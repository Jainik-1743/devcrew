---
name: make-questionnaire
description: Turn open question cards into a clean fill-in document for whoever owns the answers (product owner, teammate, client). Use when questions must be answered asynchronously.
---
# Make questionnaire

> Owner: **analyst** agent. Not running as it? Delegate this skill to it (no subagents: follow `role-analyst`). Inside it, just do the steps.


Input: open question cards. Output: `docs/questions/questionnaire-<date>.md` — plain language, no tech words.

```
# Open questions - <project> - <date>        Please reply by: <date>
For each question, tick one option or write your own. If you skip one, we'll use our recommendation.

## 1. <short title>                         (needed before we can start <spec>)
<question in one sentence>
- [ ] A) ... (our recommendation - <reason in plain words>)
- [ ] B) ...
- [ ] Other: ________
```

## Rules
- BLOCKERs first; max 10 per document; group by spec.
- Translate jargon ("OAuth SSO" → "log in with your company Google account").
- Keep card IDs in an HTML comment (`<!-- Q3 -->`) so answers map back.
- When answers return, copy them into the cards and update `project/assumptions.md`.
- If you (the developer) own the answers, skip this and answer the cards directly.
