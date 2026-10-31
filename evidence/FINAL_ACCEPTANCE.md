# October 31 acceptance and integration evidence

This record supersedes the current-status interpretation of earlier reports. Historical Copilot reports and their original assertions are preserved unchanged.

| Check | Fresh result | Evidence |
| --- | --- | --- |
| Build and complete local suite | 51 passed, zero failed/skipped | [Full output](final-acceptance-tests.txt) |
| Imported-helper reproducer | Passes unchanged; proposal blocked | `test/copilot-retest.test.mjs` |
| Arbitrary added module alongside valid fix | Blocked outside original culprit change set | `test/verification-integrity.test.mjs` |
| HTTP product journey | Eight stages passed, including exports and restart | [Journey](final-product-journey.json) |
| Tour interaction | Nine steps, keyboard/focus, dismissal, replay and blocked storage | `test/tour-interaction.test.mjs` |
| Real clsx history | Nine commits, fourteen checks, expected boundary, portable patch passes | [Case](real-world-case.md) |
| Actual local Mastra model workflow | Three steps completed; Qwen produced 301 tokens in 53.077 seconds | [Run](final-partner-run.json) |
| Live Sentry transport | HTTP 200; transaction with 14 child spans; flushed | [Run](final-partner-run.json) |
| Temporal forced worker kill/restart | Three completed check checkpoints reused; expected boundary | [Recovery](temporal-recovery.json) |

## Fix-verification scope

Command proposals cannot change the direct Node check, recognized test/configuration paths, or files outside the original culprit change set. The imported-helper counterexample is blocked without relying on helper naming conventions. Accepted command replay is labeled `restricted`, not `unchanged` integrity. This guard does not prove arbitrary dependency-graph immutability. Check logic mixed with application logic inside the allowed original files still needs review. A portable check is injected after applying the proposal; keep its assertions independent of changed application code.

## Model review

The [unaltered real response](final-partner-case.json) correctly names the failing revision but incorrectly describes its older passing parent as a revision that resolved the failure. That is a chronology error. Workflow completion and valid citation identifiers establish neither semantic accuracy nor a correct fix. No model-accuracy pass is claimed.

## Practical limits

The HTTP journey exercises the real backend and bundled-page delivery. Tour interaction uses React DOM in JSDOM with simulated layout; placement has separate unit tests. Browser control stopped because it could not determine the browser URL, so a fresh complete visual browser/mobile acceptance run could not be performed. Earlier genuine desktop screenshots remain in `docs/screenshots/`.

The Sentry result acknowledges SDK transport delivery, not a fresh dashboard inspection. Temporal recovery retains the same local disk and repository; an in-flight check can repeat. Desktop timings do not benchmark a T480. GitHub Actions remains disabled; these are local results.

Reproduce the optional experiments from the source checkout with installed dependencies and documented local integrations:

```powershell
node scripts/verify-final-journey.mjs
node --env-file-if-exists=.env.local scripts/verify-final-partners.mjs
node scripts/verify-managed-recovery.mjs 'C:\path\to\temporal.exe'
```

The partner script sends opt-in Sentry telemetry when a DSN is configured. The recovery script starts and cleans up its own local service. Neither script buys credits or posts a submission.

## Hosted demo follow-up

After adding the separate GitHub Pages recorded explorer, the complete local suite passed **56 tests, zero failures/skips**. See [full output](pages-acceptance-tests.txt) and [live HTTP checks](pages-live-verification.json). The live page, assets, bundled fonts, three reports and anonymous app download returned HTTP 200. The five added demo tests cover real receipts, absent untested logs, tab switching, patch results, model review, replay controls and report path removal. Fresh visual browser QA remains blocked by Computer Use URL detection.

## Final submission handoff

Copilot's [final independent report](COPILOT_FINAL_ACCEPTANCE_REPORT.md) found no new submission-blocking defect within its exercised API/CLI/release/HTTP scope. Its 56-test baseline and independent new test are preserved separately. After incorporating the unchanged new test, the final complete local run passed **57 tests, zero failed/skipped**; see [full output](final-submission-tests.txt). Public demo/assets/reports/download delivery was rechecked successfully. Optional integrations were not rerun by Copilot in that pass; earlier live evidence retains its original dates and scope. Fresh full visual browser/mobile QA remains incomplete.
