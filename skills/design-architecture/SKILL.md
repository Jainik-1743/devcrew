---
name: design-architecture
description: Choose the tech stack and design the system's main components, data flow and deployment with explicit trade-offs. Use when starting a project or making a major technical change.
---
# Design architecture

> Owner: **architect** agent. Not running as it? Delegate this skill to it (no subagents: follow `role-architect`). Inside it, just do the steps.


Write `docs/tech/architecture.md` (≤150 lines):

1. **Drivers** — the 5–8 requirements that shape the design (users, load, latency, privacy, integrations, budget, team skills, deadline).
2. **Stack** — one Decision block per layer (frontend, backend, database, auth, hosting, file storage, email, jobs/queues, monitoring):
   `Decision / Options (one line each + trade-off) / Recommended because <driver>`.
3. **Components diagram** (Mermaid): clients, services, data stores, third parties, and what talks to what.
4. **Key flows** — sequence diagram for the 1–3 riskiest flows (payment, auth, sync).
5. **Cross-cutting** — authN/authZ model, secrets, logging/monitoring, error handling, backups, environments (local/staging/prod).
6. **Limits** — the scale at which this design must change, and what changes.
7. **Risks & spikes** — unknowns to resolve with `try-idea` before approval.

## Rules
- Prefer managed services and the team's known stack. Fewer moving parts wins ties.
- Check current stable versions online; write them down.
- Every choice traces back to a driver. Log decisions with `log-decision`.
