# Contributing to L1DDER

Thanks for your interest in L1DDER!

## Reporting issues

Issues and feature requests are very welcome. Please open an issue and include:

- What you expected to happen and what actually happened
- Steps to reproduce (a minimal example helps a lot)
- Your environment: `l1dder --version`, Node.js version, and OS

## How this repository works

This public repository is an **auto-generated mirror** of a private source of
truth. A sync step regenerates the mirror on every release, which means **any
commit pushed directly here is overwritten**. Because of that, code doesn't get
merged into this repo directly — but your contributions are still very welcome
and fully credited (see below).

## Ways to contribute

**Issues are the primary and recommended channel.** Bug reports, feature
requests, questions, and design discussions all belong in issues — that's where
they have the most impact. See [Reporting issues](#reporting-issues) above.

**Pull requests are welcome too.** You can open a PR against this mirror to
propose a concrete change. Note how it is handled:

- A maintainer reviews your PR here and, if accepted, **re-implements the change
  through the private source repository** using the normal flow (branch →
  changeset → review → merge → release).
- **You are credited** for the contribution — your name/handle is mentioned in
  the changeset, the private PR, and the `CHANGELOG.md` (git authorship does not
  survive the sync, so we credit you explicitly).
- Once released, your change flows back into this mirror automatically.
- The PR on the mirror is then closed with a link to the released version.

This keeps a single source of truth while still letting anyone propose code.

**No CLA required.** The project is pre-1.0 and MIT-licensed; by contributing you
agree your contribution is licensed under [MIT](./LICENSE) (see below).

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

4. **Add a changeset.** Internal CI requires a changeset in **every** PR:

   ```bash
   pnpm changeset          # package behavior changed
   pnpm changeset --empty  # docs or infra only — no version bump
   ```

   Choose the bump level per [semver](https://semver.org/): `patch` for fixes,
   `minor` for backwards-compatible additions, `major` for breaking changes.
   A changeset is required even when nothing user-facing changed; use `--empty`
   so `changeset-check` stays green without opening a Version PR.
5. **Open a pull request** into `main`. Use [Conventional Commits](https://www.conventionalcommits.org/)
   for the title (e.g. `feat: add init --ai claude`). PRs are squash-merged after
   green CI and review.

Releases are cut by merging the automatically generated **Version Packages** PR,
which tags the release; publishing to npm happens from CI with provenance.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
