# Copilot findings: fixes and follow-up validation

October 31, 2026. The original Copilot reports and all three Copilot test files are preserved unchanged. Their historical failures describe the version they reviewed; this file records subsequent work by Codex.

## False passing fix verification

Command-based proposals could replace `check.mjs` with `process.exit(0)` and receive a passing verdict. Verification now blocks changes to the direct Node entry point and recognizable test/spec/fixture/configuration paths, including newly added files and renames. This applies to patches and descendant fix revisions. Unsupported shell commands require a new investigation using an independent portable Node check. Portable checks are injected after applying the proposal, with the same recorded script used across all variants.

Verification records a check fingerprint and integrity explanation in JSON, Markdown and the UI. A blocked proposal remains inconclusive, retains the two baseline checks, and has no proposed-fix execution receipt. A legitimate application-only fix still must produce parent good / culprit bad / proposal good.

These are conservative guards, not a semantic proof or a security sandbox. Filename conventions cannot identify every imported helper. A portable script can itself depend on code affected by the proposal. Review check dependencies and trust the executed repository. Do not describe this as protection from arbitrary malicious code.

## Lost active cases on shutdown

The server now retains background tasks, saves initial/progress snapshots, serializes atomic writes per case, aborts active local work during normal shutdown, and awaits final persistence. AI cancellation reaches the local inference request through both direct and Mastra paths. A saved unfinished case from an abrupt exit is shown as interrupted on restart; ordinary mode does not automatically resume it. Temporal recovery remains separate.

The broader run also caught a lifecycle race introduced during this work: autopsy completion could be visible while its lock remained held. Terminal analysis status and lock release now become visible together after saving. Investigation and verification responses likewise stay pending until cleanup and saving release their lock; immediate follow-up actions no longer race the final write. Existing durable polling assertions were retained.

Disk failures remain possible. Persistence failures are surfaced to the user; this does not promise power-loss durability or recovery before the first successful write.

## Product refinements

- Explicit AI cancellation and busy controls, including preventing archive navigation away from active work.
- Connection-loss warning with reload/reopen instructions after a server restart.
- Saving failures surfaced in the app; exports remain available during optional AI analysis.
- Verification integrity details and guidance for shell commands and changed tests.
- Separate autopsy elapsed time and clearer operation-specific cancel labels.
- README, article and integration notes distinguish the actual Copilot contribution and live synthetic Sentry setup proof from unperformed checks.

## Validation

- All seven original Copilot tests pass without edits to their assertions.
- Added coverage: fix revision disables check; check rename; new test helper; compound shell command; portable check remains independent of a replaced committed check; legitimate portable fix; AI shutdown and restart preserves the confirmed boundary.
- Full build/test result: **42 tests passed, 0 failed**, including all seven preserved Copilot tests. See `acceptance-tests.txt` for the exact output.
- Re-ran the pinned clsx historical compatibility demo: nine commits, fourteen investigation checks, expected boundary `3ec8e9f`, six fix-verification executions and a passing compatibility patch. This is an intentional upstream breaking change, not a newly discovered bug.
- Browser-control inspection was attempted but ended when the helper could not establish the active URL. No new visual QA is claimed for these refinements. Earlier screenshots/video predate this pass.
- No new live Ollama, Temporal worker-crash, full real-model Sentry ingestion or T480 benchmark is claimed by this pass. Framework unit/SDK tests remain part of the automated suite.

The prebuilt ZIP must be regenerated after the final build. Restart an already running server before retesting; loaded backend modules do not update automatically.
