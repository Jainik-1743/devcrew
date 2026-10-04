---
name: status-report
description: Write a short plain-language status report for stakeholders (team, manager, product owner or client): done, next, decisions needed and risks. Use at the end of each week or sprint.
---
# Status report

> Owner: **release-manager** agent. Not running as it? Delegate this skill to it (no subagents: follow `role-release-manager`). Inside it, just do the steps.


Write `docs/reports/status-YYYY-MM-DD.md` from progress, closed tickets and open questions:

```
Done this week:   online booking, email confirmations
Next week:        payments
Needs your input: which payment provider? (we recommend Stripe - lowest setup time)  by Thu 23 Oct
Risks:            none
Demo:             https://staging.example.com/booking
```

## Rules
- Write for a non-technical reader (no "API", "PR", "migration", "refactor"). Describe what users can now do.
- Every "needs your input" has a recommendation and a date.
- Risks are honest: say what might slip and why, plus the plan.
- ≤15 lines. Sending it is outward-facing: show the draft and send only after approval.
- Solo project with no stakeholders? Skip sending; the file still works as a weekly log.
