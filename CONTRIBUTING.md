# Contributing to L1DDER

Thanks for your interest in L1DDER!

## Reporting issues

Issues and feature requests are very welcome. Please open an issue and include:

- What you expected to happen and what actually happened
- Steps to reproduce (a minimal example helps a lot)
- Your environment: `l1dder --version`, Node.js version, and OS

## Code contributions

At this stage the codebase is developed and released by the core team, and the
public repository is a mirror of a private source of truth. External code pull
requests are **not** being accepted yet — but that will change as the project
opens up. In the meantime, the best way to shape L1DDER is by filing issues and
joining the discussion.

## Development workflow (core team)

The framework is developed inside the private source repository, and every change
follows the same flow:

1. **Branch from `main`** using a typed prefix: `feature/`, `fix/`, `docs/`, or
   `chore/` plus a short description (e.g. `feature/release-pipeline`).
2. **Write code and tests together**, following the project standards.
3. **Run the checks locally** before opening a PR:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```

4. **Add a changeset** describing user-facing changes (this drives versioning and
   the changelog):

   ```bash
   pnpm changeset
   ```

   Choose the bump level per [semver](https://semver.org/): `patch` for fixes,
   `minor` for backwards-compatible additions, `major` for breaking changes.
   A changeset is required for any change that affects behavior.
5. **Open a pull request** into `main`. Use [Conventional Commits](https://www.conventionalcommits.org/)
   for the title (e.g. `feat: add init --ai claude`). PRs are squash-merged after
   green CI and review.

Releases are cut by merging the automatically generated **Version Packages** PR,
which tags the release; publishing to npm happens from CI with provenance.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
