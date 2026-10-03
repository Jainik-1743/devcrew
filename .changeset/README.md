# Changesets

Every PR that changes what users get (CLI, agents, skills, kit.json) needs a changeset:

```bash
npx changeset          # pick patch / minor / major and write one line for the changelog
```

Commit the generated `.changeset/*.md` file with your PR. Docs- or CI-only PRs can use `npx changeset --empty`.

On merge to `main`, the Release workflow opens a **Version Packages** PR that bumps `package.json`,
`.claude-plugin/plugin.json` and `CHANGELOG.md`. Merging that PR publishes to npm and tags the release.

Stay on `patch` while the kit is `0.0.x`; `1.0.0` is cut once it is approved as stable.
