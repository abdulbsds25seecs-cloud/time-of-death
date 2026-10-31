# Copilot post-fix retest report

## Scope and environment

Retested the implementation after `evidence/REVIEW_RESOLUTION.md` using disposable Git repositories and owned loopback app instances. Sentry was disabled (`SENTRY_DSN` empty). No implementation code or existing assertions were changed. The new reproducer is `test/copilot-retest.test.mjs`.

Dependencies were restored with the committed lockfile using `npm ci`. Environment: Windows, Node `v24.14.0`, npm `11.9.0`, Git `2.53.0.windows.2`.

## Confirmed residual trust gap

### Imported check helpers can still be weakened while verification reports `passed`

**Severity:** High residual limitation  
**Affected code:** `lib/verify-fix.mjs:51-66`, especially the `protectedCheckPath`-based changed-file filter and the `checkIntegrity.status='unchanged'` path.

**Minimal reproducer:** `test/copilot-retest.test.mjs`, `API fix verification does not certify a proposal that weakens an imported check helper`.

1. Create a two-commit repository where `check.mjs` imports `check-helper.mjs`.
2. The helper asserts the known regression; the later commit changes only the application comparison.
3. Submit through `/api/investigations/:id/verify-fix` a patch changing `check-helper.mjs` to `process.exit(0)`.
4. The direct entry point `check.mjs` is unchanged and the helper path is not recognized as a test/configuration path.

**Expected:** The proposal must be blocked or marked inconclusive because the executable check dependency changed.

**Observed:** The API returned a terminal `passed` verification. The test assertion failed with:

```text
AssertionError [ERR_ASSERTION]: an imported helper that disables the check must not receive a passing fix verdict
actual: 'passed'
expected: 'passed'
```

This is explicitly acknowledged as a limitation in `evidence/REVIEW_RESOLUTION.md:11`, which says imported helpers still require manual review. It is nevertheless a confirmed counterexample to treating a passing verification as an integrity-established fix: the receipts are real `good/bad/good` executions, but the proposal changed the code that defines the check. The result should be labeled as unestablished rather than presented as a trusted fix.

**Suggested correction:** Require an explicit immutable portable check for command proposals whose dependency graph cannot be proven, or conservatively block any changed JavaScript module reachable from the direct check entry. At minimum, make the terminal status distinguish `passed-with-unverified-check-integrity` from `passed`.

## Retested areas that passed

The full suite exercised and passed the following post-fix behaviors:

- Direct check replacement, renamed checks, added test helpers, compound shell commands, and portable checks.
- Descendant fix revisions and valid application-only patches with parent-good / culprit-bad / proposal-good receipts.
- Unrelated failures, malformed patches, missing checks, timeouts, skips, unstable repeats, and abnormal exits.
- Source preservation, HTTP cancellation, rapid retry after cancellation, serialized persistence, shutdown during AI work, restart preservation of established boundaries, and no active lock after cleanup.
- CLI investigation and API investigation/report/export flows.
- Original Copilot tests remained unchanged and passed.

The imported-helper test is intentionally failing evidence; its assertion was not weakened.

## Commands and exact outcomes

```text
npm ci
```

Completed successfully and restored the locked dependencies.

```text
node --test --test-concurrency=1 test/copilot-retest.test.mjs
```

Result: 1 test, 0 passed, 1 failed. The imported-helper counterexample returned `passed`.

```text
npm test
```

Final retest result after adding the new reproducer: build succeeded; 43 tests, 42 passed, 1 failed. The sole failure was `test/copilot-retest.test.mjs`. All preserved original tests passed.

The Mastra test emitted an expected validation-error log while testing rejection of invalid citations; its test passed. No live model inference, Temporal worker-crash recovery, Sentry delivery, or T480 benchmark was claimed.

## Browser and infrastructure status

No supported browser-control tool was available for this retest. Browser interaction, desktop/narrow visual QA, reload controls, evidence selection, AI cancellation UI, archive, and download feedback remain untested; no screenshots are claimed. Live Ollama, Temporal, and Sentry integrations remain untested in this pass.

## Assessment

The resolved fixes pass the original and added direct-integrity cases, and shutdown persistence is now covered successfully. The remaining confirmed trust gap is imported check code: a real API verification can still return `passed` after changing an unrecognized helper that controls the check. This must be addressed or surfaced as an explicitly untrusted verification state before a passing result can be treated as reliable for arbitrary repositories.
