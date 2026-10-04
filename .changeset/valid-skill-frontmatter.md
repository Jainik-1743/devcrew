---
"devcrew-kit": patch
---

Fixed invalid YAML frontmatter in 11 skills (including all `/crew-*` commands) that strict parsers like Claude Code's could reject; `role-*` skills now get quoted descriptions; `remove` acts on every installed target by default. The validator now catches unquoted YAML values and changesets that name the wrong package.
