---
name: crew-change
description: Handle a requirement change: show its impact on specs, designs, tickets, code and timeline before anything changes.
disable-model-invocation: true
argument-hint: <what changed in the requirements>
---
# /crew-change

Change: $ARGUMENTS

1. Delegate to the **analyst** agent with the `handle-change` skill and the change text.
2. Show the impact table it returns and its recommendation (accept / accept later / reject, and why).
3. Ask the user to choose. Only after approval:
   - log the decision with `log-decision`,
   - mark affected FRD sections `Status: changed - needs re-approval`,
   - list tickets to add/modify/cancel for the project-manager,
   - update `project/progress.md`.
