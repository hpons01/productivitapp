# Release Process

This document describes how to ship ProductivitApp for Windows and Linux with GitHub Releases and in-app auto-updates.

## Scope

- Supported release platforms in this flow: Windows and Linux
- Update channel: GitHub Releases (public)
- Trigger: git tags matching `v*` (for example `v0.2.0`)

## How Updates Work

1. CI builds installers and metadata files through electron-builder.
2. CI publishes artifacts to a GitHub Release for the tag.
3. The app checks for updates on startup.
4. If a newer release exists, the app downloads it and prompts install.

## Prerequisites

1. Repository has Actions enabled.
2. You can push tags to the default branch.
3. `electron-builder.yml` has GitHub publish provider configured.
4. Version in `package.json` is updated before tagging.

## Files Involved

- `.github/workflows/release.yml` - release CI pipeline
- `package.json` - release and publish scripts
- `electron-builder.yml` - platform targets + publish provider

## One Release (Operator Steps)

1. Ensure code is merged and stable on main.
2. Update app version in `package.json`.
3. Commit and push the version bump.
4. Create and push a release tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

5. GitHub Actions runs `.github/workflows/release.yml` automatically.
6. Wait for both jobs:
   - Release Windows
   - Release Linux
7. Verify the GitHub Release includes:
   - Windows installer and `latest.yml`
   - Linux AppImage/DEB artifacts and Linux update metadata files

## Validation Checklist After Publish

1. Install previous app version locally.
2. Launch app while online.
3. Confirm update banner appears (available -> ready).
4. Click install and restart.
5. Confirm app version changed to the new release.
6. Confirm core data still opens correctly.

## Rollback Procedure

1. If release artifacts are broken, mark the GitHub Release as not latest or remove it.
2. Publish a fixed patch release with a newer version tag (recommended).
3. Do not reuse an existing tag; create a new tag (for example `v0.2.1`).

## Troubleshooting

- CI cannot publish release:
  - Check workflow permissions (`contents: write`).
  - Check tag format starts with `v`.
- App does not detect update:
  - Confirm release has update metadata files.
  - Confirm installed app version is lower than release version.
- Linux/Windows artifact missing:
  - Check corresponding CI job logs and rerun the failed job.

## Notes

- This flow currently excludes macOS release/signing/notarization.
- Add signing before broad public rollout to reduce trust warnings.
