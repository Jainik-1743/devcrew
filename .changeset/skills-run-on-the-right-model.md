---
"devcrew-kit": minor
---

Each skill now runs on the model its work needs, whatever model your main chat uses. Agents pick a model for their job instead of `inherit`: opus for the analyst, architect and reviewer; sonnet for building, design, testing and the codebase expert; haiku for tickets, docs and releases. Owned skills set `context: fork`, `agent:` and `model:`, so `/create-tickets` runs as the project manager on haiku and `/review-code` runs as the reviewer on opus. Context-dependent skills (`track-progress`, `log-decision`, `write-handoff`, `confirm-done`, `build-step-by-step`) stay inline. These routing keys are stripped for `--target agents`. `devcrew-kit info` shows where and on which model each item runs, and the validator rejects `inherit` and routing that doesn't match the owners.
