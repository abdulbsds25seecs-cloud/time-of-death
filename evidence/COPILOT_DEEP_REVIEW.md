# Copilot deep adversarial review

## Scope exercised

Read `PROJECT_PLAN.md`, `AUTOMATION.md`, `README.md`, the prior `evidence/COPILOT_REVIEW.md`, `test/copilot.test.mjs`, all existing `test/*.test.mjs` files, `lib/engine.mjs`, `lib/process.mjs`, `lib/doctor.mjs`, `lib/verify-fix.mjs`, `lib/ai.mjs`, `lib/issue-report.mjs`, `server.mjs`, `scripts/launch.mjs`, and the relevant result-state code in `src/main.jsx`.

The new tests used actual Git histories and the loopback API. They covered negative fix controls, a broken baseline, HTTP cancellation followed by a later successful case, and shutdown during active work. No external network, credentials, `.env` files, model, Temporal service, or Sentry service was used.

## Confirmed findings

### 1. Server shutdown can lose an in-flight case entirely

**Violated invariant:** Work interrupted by a restart should remain inspectable and be labeled interrupted/cancelled rather than disappearing.

**Affected code:** `server.mjs:127` (`close()` aborts `active` but only waits for `server.close()`); persistence is scheduled in the asynchronous operation finalizer at `server.mjs:82`.

**Reproducer:** `test/copilot-deep.test.mjs`, `closing the server during work persists an honest interrupted case for restart inspection`. Start an API investigation with a hanging check, wait until `/api/health` reports the case active, call `app.close()`, then inspect `data/reports`.

**Observed:** The test failed because `<case-id>.json` was absent after shutdown. The active investigation is aborted, but `close()` does not await the investigation/finalizer that writes the report.

**Expected:** Shutdown should await cancellation and persistence, or persist an interrupted snapshot before closing, so a new server can load the case and mark it honestly.

**User impact:** Reload/restart during a long check can lose the case record and all progress/evidence rather than showing an interrupted operation. This undermines the documented reload/restart and failure-recovery workflow.

### 2. Existing check-replacement false positive is confirmed through the public API

This is the prior finding, not a new root cause. `test/copilot-product.test.mjs` confirms it through `/api/investigations/:id/verify-fix`; the result is `passed` after a patch replaces `check.mjs` with `process.exit(0)`. The original `test/copilot.test.mjs` remains unchanged and still fails for the same reason.

## Negative controls and recovery checks

- An unrelated but valid application patch left the culprit failing and was returned as `rejected`.
- A malformed patch was `inconclusive` with only the parent and culprit checks recorded.
- A purported good endpoint that already failed was `inconclusive` with no result.
- HTTP cancellation produced `cancelled`, no result, and no false fix verdict; a later normal investigation completed successfully.
- Existing timeout, skip, unstable, abnormal-exit, missing-module, source-preservation, and report tests passed in the no-build run.

## Test commands and results

```text
node --test --test-concurrency=1 test/copilot-deep.test.mjs
```

Result: 3 tests, 2 passed, 1 failed. The failure is the shutdown-persistence reproducer above.

```text
node --test --test-concurrency=1 test/copilot-product.test.mjs
```

Result: 3 tests, 2 passed, 1 failed. The failure is the public-API check-replacement reproducer.

```text
npm test
```

Blocked before running tests because the declared build dependency was unavailable:

```text
'vite' is not recognized as an internal or external command
```

For additional evidence, the test runner was invoked without the build step:

```text
node --test --test-concurrency=1 test/*.test.mjs
```

Result: 36 tests, 31 passed, 5 failed. The five failures were:

1. Shutdown persistence (`test/copilot-deep.test.mjs`).
2. Public API check replacement (`test/copilot-product.test.mjs`).
3. Preserved original check replacement (`test/copilot.test.mjs`).
4. Mastra integration test blocked by missing `@mastra/core`.
5. Local Sentry envelope test blocked by missing `@sentry/node`.

No existing test or implementation file was modified.

## Weaknesses in existing tests

The existing fix-verification tests prove a legitimate patch and a patch that still fails, but they do not prove that the command-based regression check remains unchanged. They therefore allow the `check.mjs -> process.exit(0)` proposal to pass. The new API test demonstrates that this gap is not limited to an internal helper.

The existing server tests verify operation completion and lock release, but do not close the server while an investigation is active and then inspect the saved report. Consequently, they do not establish restart persistence for ordinary non-durable work.

## Known variants and static-only concerns

- Existing fix revisions, npm-script changes, imported helpers, and execution-environment changes are variants of the same unresolved trust-root problem when they alter what the command executes; they were not reported as separate findings.
- `src/main.jsx` correctly displays “Recorded result for the previous proposal” after an edited proposal, but this was source inspection only, not a browser interaction.
- Citation IDs in AI reports are existence-checked; semantic citation accuracy remains a documented limitation and was not exercised without a model.
- Merge-containing ranges remain an explicit product limitation, not a finding.
- Browser layouts, keyboard controls, screenshots, Ollama behavior, Temporal recovery, live Sentry delivery, and performance targets were not executed in this pass.

## Cleanup and assessment

The test hooks removed the campaign fixture contents under `work/copilot-product/` and `work/copilot-deep-review/`; no campaign-owned server or check process remained. The evidence now contains one independently reproduced product-level false fix, one additional confirmed shutdown data-loss finding, passing cancellation/source-preservation/negative-control evidence, and explicit build/integration/browser limitations. The builder still needs to correct the trust boundary and await/persist shutdown before the result can be treated as reliable.
