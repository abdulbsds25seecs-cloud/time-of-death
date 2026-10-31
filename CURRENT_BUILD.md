# Current build: October 31, 2026 — preview 0.2

This owner-requested prerelease is not a published hackathon submission or production certification.

## Run

Extract the entire time-of-death-prebuilt.zip, install Node.js 22.13+ and Git, and open Start-Time-of-Death.cmd on Windows. Other platforms can run node server.mjs in the extracted directory. Standard local mode needs no npm install or paid service. Optional integrations require separate documented dependencies/setup. Credentials, case data, models and third-party executables are excluded.

## Changed and verified

- Block command fix proposals outside the original culprit change set, including imported check helpers of arbitrary names. Accepted command replay is explicitly restricted; no dependency-graph proof is claimed.
- Preserve Copilot's original reproducer unchanged; it now passes.
- Build and complete local suite: **51 passed, zero failed/skipped**.
- Real HTTP journey: readiness, investigation, patch replay, three exports and reopening after restart passed.
- React DOM tour tests cover nine steps, keyboard/focus behavior, dismissal, replay and blocked storage.
- Fresh clsx historical case: nine commits, fourteen checks, expected boundary and six successful patch-verification receipts.
- Real local Mastra/Qwen inference and opt-in Sentry transport HTTP 200 with fourteen child spans.
- Fresh Temporal forced worker kill/restart reused three completed check checkpoints.

The [acceptance record](evidence/FINAL_ACCEPTANCE.md) links raw evidence and limits. The [mock article](article/MOCK_SUBMISSION.md) is ready for owner review, not published.

## Limits

The local model made a chronology error in its explanation; the raw response is retained. Citation validation does not establish truth. Sentry delivery acknowledgement does not establish fresh dashboard inspection. Temporal retains the same local checkpoint disk; an in-flight check can repeat.

Complete fresh visual browser/mobile acceptance could not be performed because browser control could not determine the current URL. DOM and HTTP tests cover behavior, not pixels. T480 performance remains unmeasured. A disposable checkout is not a security sandbox. Review check logic and exports before trusting or sharing them.

The repository is private and GitHub Actions remains disabled. Judges will need repository access before submission; no hosted green CI or automatic DEV publication is claimed.
