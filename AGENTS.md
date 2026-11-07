# Repository workflow

Repository: `https://github.com/mphucc22/4english.git`; working branch: `main`.

The user has authorized committing and pushing completed changes in this project after appropriate verification. Continue this workflow for subsequent requested edits without asking for separate conversational confirmation.

- Inspect Git status and the diff before editing and before committing. Preserve unrelated work and include only the changes relevant to the requested task unless the user asks to publish all current changes.
- Run checks appropriate to the change. Documentation-only edits need a diff and link check; application changes need the relevant tests and build.
- Create a focused commit, push to `origin/main`, and confirm the remote commit when access is available. If remote history has advanced, fetch and reconcile it without discarding changes.
- Preserve Git history. Do not force-push, rewrite prior commits, or remove historical test evidence unless explicitly requested.
- Keep SQLite databases, private environment files, credentials, `node_modules`, and build output out of Git. Use existing authentication without printing or committing credentials.
- Native sandbox and service approval requirements still apply. If a push fails, keep the local commit and report what remains; do not claim it was published.
- This authorization applies when handling requested project work. Do not install a background auto-push watcher or publish arbitrary file saves.
