---
name: send-update
description: Post a short status update to Slack or a ticket after milestones. Use when a ticket closes, a release ships or a blocker appears.
---
# Send update

> Owner: **release-manager** agent. Not running as it? Delegate this skill to it (no subagents: follow `role-release-manager`). Inside it, just do the steps.


Draft (≤5 lines), show it to the user, send only after approval (outward-facing):

```
:white_check_mark: PROJ-12 Online booking — done (PR #42 merged)
Next: PROJ-13 Cancel booking
Needs input: payment provider (we recommend Stripe) — by Thu
```

## Rules
- Channel/ticket from `project/tools.md`. Use the Slack/tracker MCP or CLI; if none, give the text to paste.
- Facts only, with links. No internal jargon in stakeholder-visible channels.
- Blockers get their own message with the decision needed and a recommendation.
