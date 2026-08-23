# Contributing

ENAcademy is private while its first production architecture is stabilized. Before a future public release, add an explicit open-source license and a responsible disclosure address.

## Workflow

Enable the repository-managed Git hooks once after cloning:

```bash
./scripts/install-git-hooks.sh
```

Then use the pull-request-only workflow:

1. Update `main`, then create a focused `codex/<change-name>` or `feature/<change-name>` branch.
2. Add a Flyway migration for every schema change; never edit an applied migration.
3. Keep authorization rules in the Spring API, not only in the interface.
4. Run `make curriculum` after curriculum edits.
5. Run `make test` and `docker compose config --quiet` before opening a pull request.
6. Push the branch and open a pull request targeting `main`.
7. Review the diff and completed CI checks on GitHub, then merge manually from GitHub.

Direct pushes to `main`, automatic merging, and agent-initiated merging are not part of this workflow. The local pre-push hook blocks direct `main` updates. Git hooks can be bypassed locally, so server-side GitHub branch protection should also be enabled if the repository becomes public or the account is upgraded to a plan that supports protection on private repositories.

Commits should be small, explain why the change exists, and avoid generated build output or secrets.
