# ENAcademy repository instructions

These instructions apply to every Codex task in this repository.

## Pull-request-only workflow

- Never commit or push changes directly to `main`.
- For every task that changes repository files, create or reuse a focused branch named `codex/<short-kebab-case-description>` before committing.
- Keep unrelated user changes intact and do not rewrite published history.
- Run the relevant checks before publishing the branch. For broad changes, run `make test` and `docker compose config --quiet`.
- Push only the focused branch and open a pull request targeting `main`.
- Include the behavior changed, verification performed, and any migration or deployment impact in the pull-request description.
- Never merge, squash, rebase-and-merge, enable auto-merge, or close a pull request. Return the GitHub pull-request URL and leave the final merge decision to the user in GitHub.
- Read-only investigation does not require a branch or pull request.

The repository's local pre-push hook blocks direct updates to `main`. Do not bypass it with `--no-verify`.
