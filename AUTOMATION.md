# Repeatable preparation

The normal app remains lightweight. Preparation scripts automate development/release work and may need the source dependencies, Git, network access for the first public-history download, and the optional tools listed below. No command publishes anything or buys services.

## One command

```powershell
npm run prepare:submission
```

This builds and tests the app, reconstructs the pinned clsx compatibility case, checks endpoint readiness, finds the historical boundary, verifies a compatibility patch, exports Markdown/JSON and an issue draft, refreshes the article's measured-results block, and packages the tracked source with the built frontend. Results and remaining user steps are saved in `evidence/submission-preparation.json`.

Packaging includes tracked files, including their working edits. Commit new source files before packaging so they are included. Local configuration, `.data`, downloaded history, model weights and `node_modules` are excluded.

To also start an isolated local Temporal service, run the recovery experiment on its own task queue, and stop that service afterward:

```powershell
npm run prepare:submission -- --temporal-cli C:/Tools/temporal.exe
```

An existing Temporal worker is not stopped. The experiment owns only the worker and local service it launches. SQLite/checkpoint files remain local. For a quicker preparation run after tests already passed, use `--skip-tests`.

## Narrated walkthrough

```powershell
npm run prepare:submission -- --video
```

This uses actual saved browser screenshots listed in `article/DEMO_SCENES.json`. Windows System.Speech generates narration offline with Microsoft David Desktop; the installed FFmpeg creates an H.264/AAC MP4 and scene-caption SRT beside the project folder. No paid voice service is used. This is a screenshot-based narrated walkthrough, not continuous live screen recording. The scene manifest also serves as its transcript.

Screenshots are captured and reviewed through the browser separately; the preparation command does not pretend to refresh them. Recapture screenshots after changing the UI or demonstration. Without FFmpeg/the Windows voice, omit `--video` and use the supplied transcript to record a walkthrough.

## Product workflows from the CLI

```powershell
# Only check that the endpoints are suitable for bisection.
node cli.mjs --demo --doctor --json --output readiness.json

# Investigate and export a bug-report draft.
node cli.mjs --demo --issue --output issue-draft.md

# Verify a trusted patch against a saved, conclusive case.
node cli.mjs --verify-case case.json --patch fix.diff --json --output verified.json

# Or verify a descendant fix revision already in that repository.
node cli.mjs --verify-case case.json --fix-revision COMMIT --output verified.md
```

Patch verification reruns the baseline; it never edits the original working tree. A passing outcome establishes only the supplied check. Commands and proposed fixes execute trusted code with the current account's permissions. A draft issue is exported locally, never posted.

## What remains user-controlled

- Free Sentry account/project creation and the project DSN. Local SDK capture is already exercised; live ingestion still needs configuration.
- Public repository, video hosting and DEV publication. Review the concrete artifacts before sharing; reports may include source paths and captured output.
- Final eligibility, article wording and category selection. A prepared local build is not a submitted challenge entry.

No script assumes Copilot authentication, claims an unperformed review, or invents external CI results.
