# Product acceptance and failure-recovery campaign

Test Time of Death as a developer using the product, not only as a reviewer reading functions. Start with README.md, AUTOMATION.md, the existing test suite, and both COPILOT review task/result files. Preserve all existing reviews and reproducers. The known check-replacement false-positive remains unresolved unless actual code and a rerun establish otherwise.

## Deliverables and boundaries

You may create test/copilot-product.test.mjs, evidence/COPILOT_PRODUCT_TEST_REPORT.md, genuine screenshots named evidence/copilot-product-*.png, and disposable fixtures under work/copilot-product/. Do not edit implementation, existing tests, package configuration or the article. No installs, purchases, pushes, account changes, external requests or posting. Do not read credentials or unrelated files. The app may create its own normal temporary clones. Test only repositories, processes and servers you create for this campaign. Never stop an existing user's server or process. Use an ephemeral port for an isolated server.

Keep Sentry disabled for the baseline. Do not require a model, cloud account or Temporal service. If optional infrastructure is unavailable, mark its checks untested rather than pretending to exercise them. Do not install a browser automation framework. Use supported browser/UI tools if available; otherwise complete the API/CLI scenarios and explicitly mark browser interaction and visual inspection blocked. An HTTP response is not proof that the frontend renders or that a button works.

## Start from an actual user journey

Build a small real Git fixture with a known good-to-bad transition, plus a separate known-correct fix. Keep expected answers independently of the product's output. Add a dirty tracked file, staged change and untracked file to the source checkout; snapshot their exact contents, HEAD, index and status. Never use a user's real repository for destructive or deliberately broken checks.

Exercise the public CLI and HTTP API. Where supported browser tools exist, additionally perform the corresponding UI actions through the rendered interface. Record which surface you actually tested.

### Priority acceptance scenarios

1. **First use:** start an isolated app, load its built interface and required assets, open a case, run readiness, then investigate. Readiness must not declare a culprit. The search must identify the independently known boundary and retain candidate/parent execution receipts. Source snapshots must match afterward.
2. **Useful output:** select tested revisions and inspect their stdout/stderr, switch diff views, follow evidence references, and export Markdown, JSON and an issue draft. Compare exported hashes, outcomes and execution counts with actual receipts. A download filename alone does not establish correct exported content.
3. **Correct fix:** submit the independently correct proposal. Require actual parent-pass, culprit-fail, proposal-pass receipts. Then try a no-op proposal and a still-broken proposal. Neither may be accepted as a fix.
4. **Dishonest fix:** exercise the existing check-replacement reproducer and one materially different route, such as an existing fix revision that weakens the test. Group variants by shared root cause. Do not merely produce more tests for the same defect. Portable check behavior should be examined separately.
5. **Edited proposal:** after a successful verification, edit the patch or switch proposal format. Verify trust resets and the recorded result is clearly associated with the old proposal. Do not claim a browser check if this was only inspected in source.
6. **Bad environment:** missing check file, missing imported dependency, command that cannot execute, and a failure unrelated to the target failure string. The product must not mistake these for the requested regression or a valid fix. Confirm it explains what the user should inspect next.
7. **Unstable check:** a fixture that alternates good and bad across repeats. It must remain inconclusive, and its contradictory receipts must remain inspectable. Also verify that a later normal investigation still works.
8. **Timeout and cancellation:** hang a check within a bounded timeout, cancel an investigation, and cancel fix verification. Confirm there is no false success, relevant child processes terminate, and another operation can start. Use owned process IDs and bounded cleanup. Do not kill arbitrary node.exe processes.
9. **User mistakes:** empty fields, invalid or reversed revisions, identical endpoints, unsupported merge range, and a patch that does not apply. Check API status/body as well as user-visible guidance when a browser is available. No broken state should require deleting the user's data to recover.
10. **Two actions at once:** use deterministic synchronization to submit simultaneous operations, repeated verification and analysis requests, and cancellation during progress. Ensure the single-operation policy is enforced and results do not attach to the wrong case. Do not rely on random sleeps.
11. **Reload and restart:** reload while work runs, reconnect to events, then restart only the isolated server you own. Inspect saved cases. Ordinary interrupted work must be labeled honestly; it must not masquerade as Temporal recovery or completed work. Confirm the app can accept a new case afterward.
12. **Model unavailable:** run without Ollama or without a selected installed model. The Git investigation, evidence, fix verification and exports must remain usable. Do not manufacture an AI response. If testing analysis state with a controlled substitute, label that as an orchestration test rather than real inference.
13. **Bounded noisy output:** use one fixture that emits more than the capture limit, then fails. Confirm bounded capture, visible truncation and retained verdict evidence without excessive memory growth. Stop after proving the limit; do not flood the machine.
14. **Repeated use:** run five sequential short cases, including one failure/cancellation and a final success. Track app-owned processes, active-operation state, memory samples and leftover disposable paths. Separate evidence of a persistent leak from normal runtime variation. Do not claim T480 performance from this machine.

If browser tools exist, inspect desktop and 375px layouts, keyboard run/cancel controls, reachable cancellation, long paths/output, selected evidence, verification state and export feedback. Capture representative real screenshots. Do not generate simulated screenshots or call static HTML inspection a visual check.

## Test discipline

- Use independently known fixture outcomes and negative controls. A 200/202 response or a completed promise is insufficient: assert terminal product behavior and inspect the underlying receipts.
- Use unique fixture directories and ephemeral ports, bounded polling and explicit deadlines, deterministic synchronization where races matter, and cleanup hooks that run on assertion failures.
- Before recursive cleanup, verify the resolved target is inside the fixture directory this campaign created. Preserve failure logs before cleanup. Do not leave a hanging check, server or child worker behind.
- Do not weaken assertions, modify the app to make tests pass, omit failures from the report, invent coverage percentages, or describe source inspection as executed behavior.
- Aim for two bounded passes: normal workflows, then failure/recovery. Prioritize the critical paths over a large superficial test count. If a known critical failure occurs, record it and continue independent safe scenarios; do not repeat the same failure indefinitely.

Run the new suite with:

```text
node --test --test-concurrency=1 test/copilot-product.test.mjs
```

The existing unresolved Copilot test may fail in a full npm test run. Report that separately from new product-test failures.

## Report the actual campaign

Create a table with scenario, tested surface (UI/API/CLI/static), fixture/input, expected outcome, observed outcome, evidence/test name and pass/fail/blocked status. For failures, record minimal reproduction steps, affected files/lines if understood, and user impact. Include all failed and blocked scenarios, exact commands, test totals, environment, elapsed campaign time, and cleanup results.

End with: (1) confirmed blockers to trusting the result, (2) usability problems, (3) infrastructure-dependent checks still untested, and (4) the smallest corrections that would improve confidence. A passing campaign does not prove correctness on arbitrary repositories.

## Optional Sentry follow-up, after local correctness testing

Do not create or configure the user's account. Once the user has configured the project, run a clearly labeled synthetic case and a controlled failure through the instrumented app. Verify actual ingestion using available authorized access, correlate operation timing/status with local receipts, and inspect whether private source, commands, prompts, output or identity appeared in transmitted data. Do not expose the DSN or credentials in evidence.

Local SDK test envelopes are not proof of cloud ingestion. Traces explain observed execution; they do not establish that a regression verdict or proposed fix is correct. Record live Sentry work as blocked if access is unavailable.
