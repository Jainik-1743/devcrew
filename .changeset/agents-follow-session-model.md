---
"devcrew-kit": patch
---

Agents now inherit the session model (`model: inherit`) so they work on any model and follow `/model`. Every skill carries an owner line that hands it to its agent. Fixed skill ownership: `apply-feedback` and `add-regression-test` move to the developer (the reviewer is read-only), and the analyst gets `log-decision`.
