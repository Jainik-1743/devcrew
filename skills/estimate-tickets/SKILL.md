---
name: estimate-tickets
description: Size each ticket S or M and split anything larger. Use after tickets are created and before sprint planning.
---
# Estimate tickets

Sizes: **S** < half a day · **M** about a day · **L** = must split (never stays L).

For each ticket, estimate from: number of acceptance checks, layers touched (UI/API/data), new vs reused components, unknowns, integrations.
- Unknown that could double the size → note `Risk:` and suggest a `try-idea` spike task.
- Split L by: rule (one rule per story), user role, happy path vs edge cases, read vs write, UI vs admin.
- After splitting, every original acceptance check must still land in exactly one ticket.

Output: table `KEY | title | size | risk`, plus the totals (S count, M count, ≈ days).
