# Final independent product acceptance

## Run metadata

- Start: `2026-10-31T15:11:45+05:00`
- End: `2026-10-31T15:45:07+05:00`
- Source commit checked: `cedced297049940b2ec143cb7490099f01353823`
- OS: Windows
- Node: `v24.14.0`
- npm: `11.9.0`
- Git: `2.53.0.windows.2`
- Sentry: disabled for ordinary tests
- Owner port `4317`: left untouched; acceptance server used ephemeral ports

The worktree had the pre-existing untracked `BUILD_INFO.json` before this review. New acceptance artifacts are `test/copilot-final-acceptance.test.mjs` and `work/copilot-final/`. No production code or existing assertions were changed.

## Acceptance matrix

| Surface/scenario | Result | Observation and artifact |
|---|---|---|
| Full local build and suite | **PASS** | `npm test` completed with build success and **56 tests passed, 0 failed, 0 skipped**, exit code 0. Mastra's invalid-citation error log was expected within a passing test. |
| Independent API negative paths | **PASS** | `test/copilot-final-acceptance.test.mjs` passed. Missing trust and malformed JSON returned 400; unknown case 400; traversal request 404; foreign Origin 403; duplicate active investigation 409; independent space/Unicode fixture found its known candidate. |
| API product journey | **PASS** | Source `createApp({port:0})` journey covered demo, readiness, investigation, JSON/Markdown/issue exports, and candidate/parent receipts. Raw results are in `work/copilot-final/api-negative.json`; release API observations are recorded below. |
| Extracted public release ZIP | **PASS** | Anonymous ZIP download returned 200. Archive extracted without `node_modules`; no `.data`, `.env.local`, credentials, models, or binaries were found. Standard mode served HTML/assets and completed a synthetic investigation, exports, CLI run, and restart/archive inspection. |
| Release CLI | **PASS** | `node cli.mjs --demo --repeats 1 --json --output ...` exited 0; report status was `complete`, with the independently known candidate and 8 receipts. |
| Hosted GitHub Pages HTTP delivery | **PASS** | `node scripts/verify-pages.mjs` returned `status: passed`; root/demo pages, JS, CSS, fonts, three reports, and anonymous ZIP all returned HTTP 200. |
| Hosted static explorer behavior | **PASS** | Existing public-demo tests in the full suite passed: recorded notice, untested revisions without invented logs, replay/pause/full-recording behavior, tabs, patch receipts, reviewed AI error, and report path sanitization. These are DOM/static tests, not browser pixels. |
| Fresh visual browser/mobile QA | **BLOCKED** | No browser-control tool could establish a usable browser URL. No fresh desktop/narrow screenshots or visual claims are made. |
| Optional Ollama inference | **NOT TESTED** | No model service was required or started in this acceptance pass. |
| Temporal worker kill/recovery | **NOT TESTED** | No Temporal CLI/service was started in this pass. Historical evidence is not treated as fresh execution. |
| Live Sentry delivery/dashboard | **NOT TESTED** | Sentry was intentionally disabled for ordinary tests; no fresh dashboard inspection was performed. |
| T480 performance/cross-platform behavior | **NOT TESTED** | This Windows workstation is not evidence for the documented T480 or Linux claims. |
| Windows launcher | **NOT TESTED** | The extracted server and CLI were exercised; `Start-Time-of-Death.cmd` was not launched to avoid an uncontrolled browser/process. |

## Actual product observations

### Source API

The independent API run used a repository path containing spaces and Unicode and produced:

```json
{
  "noTrust": { "status": 400 },
  "badJson": { "status": 400 },
  "unknownCase": { "status": 400 },
  "traversal": { "status": 404 },
  "foreignOrigin": { "status": 403 },
  "busyGuard": {
    "status": 409,
    "body": { "error": "An investigation is already running. Cancel it or wait for its result." }
  },
  "final": {
    "status": "complete",
    "candidate": "a48b089e7103bbe9c9988be8a6681495ac0e474b",
    "expected": "a48b089e7103bbe9c9988be8a6681495ac0e474b"
  }
}
```

The release API journey independently observed readiness `ready` with 2 endpoint receipts and no result, then `complete` with the expected candidate, passing parent, 8 investigation receipts, and successful JSON/Markdown/issue exports. The issue draft contained `No issue has been published`.

### Release ZIP

The public release URL returned HTTP 200 and `BUILD_INFO.json` identified source commit `bc165b29b04d85d7cb17c70973b6ff6d2b9c53ce`, which differs from the current source commit `cedced297049940b2ec143cb7490099f01353823`. The release is therefore an earlier snapshot, not automatically certified by the current source checkout. It nevertheless passed its own extracted standard-mode synthetic journey and CLI run.

The archive contained `.env.example`, documentation, article metadata/checklist, evidence, source, tests, and `dist`; it did not contain `.env.local`, `.data`, `node_modules`, credentials, downloaded models, or third-party binaries. The article entries were metadata/checklist files, not a local ignored draft.

The hosted JavaScript contains strings such as `127.0.0.1` and `ollama` in the recorded guide text, but the inspected bundle had no `/api/` endpoint reference. This is consistent with the hosted explorer being static; visual/browser execution was still unavailable.

## Defects

No new defect was confirmed within the exercised scope. The previously identified imported-helper trust concern is addressed by the current conservative original-change-set guard in the passing 56-test suite; this review did not weaken or replace that assertion.

The release/source commit mismatch is a release reproducibility concern, not a demonstrated runtime defect: the downloaded ZIP's actual journey passed, but it must be reviewed as the tested artifact rather than assumed identical to current source.

## Commands and outcomes

```text
npm test
```

Exit 0. Build succeeded; 56 tests passed, 0 failed, 0 skipped.

```text
npm run build:demo
```

Exit 0. Hosted recorded demo built successfully.

```text
node scripts/verify-pages.mjs
```

Exit 0. JSON result reported `status: passed` for public pages, assets, reports, and anonymous ZIP delivery.

```text
node --test --test-concurrency=1 test/copilot-final-acceptance.test.mjs
```

Exit 0. 1 test passed, 0 failed.

The extracted release CLI exited 0 and produced a complete JSON report with 8 receipts. The extracted release API completed readiness, investigation, exports, restart, and archive inspection successfully.

## Practical verdict and owner handoff

Within tested local/API/CLI/release/HTTP scope, no new submission-blocking runtime defect was found. The strongest evidence is the fresh 56-test suite, independent negative API checks, and an actual journey against the anonymous release ZIP rather than the source `dist`.

Three highest-priority follow-ups:

1. Keep the downloaded release commit and current source commit explicitly synchronized or document the intentional snapshot difference in release preparation.
2. Obtain a real browser-control run for desktop/mobile layout, keyboard actions, reload, archive, and download feedback; current evidence cannot claim visual acceptance.
3. Run separate fresh Ollama, Temporal, and Sentry checks only when their local services are deliberately available; do not promote historical evidence to current acceptance.
