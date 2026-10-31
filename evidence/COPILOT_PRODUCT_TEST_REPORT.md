# Copilot product acceptance campaign

## Scope and environment

The campaign used isolated synthetic Git repositories under `work/copilot-product/`, with independent expected boundaries from `createDemo`. It exercised the loopback HTTP API, the public CLI, real disposable-clone execution, source-tree snapshots, saved reports, and fix-verification receipts. No implementation files, existing tests, external services, Ollama, Temporal, or Sentry were used. `SENTRY_DSN` was explicitly empty for the campaign.

Environment: Windows, Node `v24.14.0`, Git `2.53.0.windows.2`. The campaign fixtures and child processes were cleaned by test hooks; no fixture contents or owned server processes remained.

## Scenario results

| Scenario | Surface | Fixture/input | Expected | Observed | Evidence | Status |
|---|---|---|---|---|---|---|
| First use, readiness, investigation | API plus served built page | 5-commit synthetic history; dirty tracked, staged, and untracked source files | Readiness has no culprit; search finds independently known boundary; source is unchanged | Ready had 2 endpoint receipts and no result. Investigation found the known candidate and parent with receipts. HEAD, index, status, and file contents matched exactly afterward | `product API journey...` | **PASS** |
| Useful output | API | Completed case | JSON, Markdown, and issue draft agree with receipts; issue is not posted | Candidate, run count, execution evidence, and issue disclaimer matched | `product API journey...` | **PASS** |
| Correct fix | API | Unified patch changing `<=` to `<` | Parent good, culprit bad, proposal good | Verification returned `passed` with `good/bad/good` checks and 3 receipts | `product API journey...` | **PASS** |
| CLI workflow | CLI | Same known fixture and a missing-check control | CLI confirms known boundary; missing check is inconclusive | JSON report exited 0 with expected candidate. Missing check exited 2 and reported an inconclusive/dependency failure | `CLI reports...` | **PASS** |
| Dishonest check replacement | API | Patch replaces committed `check.mjs` with `process.exit(0)` | Must not be accepted as a fix | Verification returned `passed` | `false-positive check replacement...` | **FAIL** |
| Browser interactions and visual inspection | Browser/UI | No browser automation or supported browser-control tool available | Exercise rendered controls, layouts, keyboard, evidence selection, cancel, and exports | The served HTML/assets were fetched over HTTP, but no browser interaction or screenshot was performed | Not testable with available tools | **BLOCKED** |
| Ollama unavailable behavior | API/UI | No model service required by baseline | Git result and exports remain usable without AI | Model-unavailable behavior was not separately exercised in this campaign | Not run | **UNTESTED** |
| Temporal recovery | API/service | Requires Temporal service | Recovery receipts and restart behavior | Not run; no Temporal service was started | Not run | **UNTESTED** |
| Live Sentry ingestion | Integration | Requires user DSN/account | Correlate cloud event with local receipts | Not run; baseline kept Sentry disabled | Not run | **UNTESTED** |
| Five-case repeated-use and T480 performance | API/process | Repeated lifecycle and memory/process sampling | No persistent leak; no unsupported performance claim | Not run as a separate campaign | Not run | **UNTESTED** |

## Commands and outcomes

```text
node --test --test-concurrency=1 test/copilot-product.test.mjs
```

Result: 3 tests, 2 passed, 1 failed. The failure was the dishonest check-replacement scenario; observed verification status was `passed`.

```text
node cli.mjs --repo <fixture> --good <known-good> --bad <known-bad> --command "node check.mjs" --repeats 1 --json --output <report>
```

Result: exit 0; report status `complete`; candidate matched the independently known fixture boundary.

The full `npm test` command was attempted separately and was blocked before tests because `vite` was not installed:

```text
'vite' is not recognized as an internal or external command
```

The no-build test run was performed separately to retain behavioral evidence. It reported 36 tests, 31 passed, and 5 failed; the failures are documented in the deep review, including the preserved original Copilot reproducer and the new shutdown-persistence finding.

## Confirmed blocker to trusting a result

`lib/verify-fix.mjs:32-40` applies a proposed patch before running a command-based check. A proposal can weaken or replace that check and receive `passed`; this is reproducible through the public API, not only a direct unit call. A passing fix therefore does not yet establish that the original regression check passed against the application change.

## Usability and recovery observations

The API journey provides useful terminal receipts, preserves dirty source state, distinguishes readiness from a candidate, and leaves a new operation available after cancellation. Browser usability, visual layout, keyboard controls, and user-visible export feedback remain unverified because no browser-control tool was available.

## Smallest confidence improvements

Preserve or fingerprint the original command/check inputs during fix verification and reject proposals that alter them, or require an injected immutable portable check. Make server shutdown await the active operation's cancellation and persistence so restart can inspect an honest interrupted case. Install the already-declared dependencies in a controlled environment before relying on the build/full-suite result.
