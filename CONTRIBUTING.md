# Contributing

ENAcademy is private while its first production architecture is stabilized. Before a future public release, add an explicit open-source license and a responsible disclosure address.

## Workflow

1. Create a focused branch from `main`.
2. Add a Flyway migration for every schema change; never edit an applied migration.
3. Keep authorization rules in the Spring API, not only in the interface.
4. Run `make curriculum` after curriculum edits.
5. Run `make test` and `docker compose config --quiet` before opening a pull request.
6. Describe the behavior, migration impact, and verification evidence in the pull request.

Commits should be small, explain why the change exists, and avoid generated build output or secrets.
