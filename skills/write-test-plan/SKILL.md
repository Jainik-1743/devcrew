---
name: write-test-plan
description: List what to test for a feature: happy path, wrong input, empty data, slow network, permissions, devices and keyboard. Use before testing a ticket or feature.
---
# Write test plan

Write `docs/tests/<KEY>-plan.md` — a table the tester can execute:

| # | Area | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Happy path | ... | ... | |

Always include rows for:
- each acceptance check (copied) · wrong/invalid input · empty data · very long text / large numbers
- slow or offline network (DevTools throttling) · double-click / repeated submit · back button / refresh mid-flow
- no permission / other user's data · logged out / expired session
- phone (375px), tablet, desktop · keyboard only · both themes
- data side-effects: emails sent, records created, audit logs

Mark which rows are automated (test path) vs manual.
