# Copilot review task

Act as an independent reviewer of Time of Death, a local Git regression investigator for Windows/Linux. Read PROJECT_PLAN.md and AUTOMATION.md. Review lib/engine.mjs, lib/process.mjs, lib/doctor.mjs, lib/verify-fix.mjs, lib/ai.mjs, scripts/launch.mjs and server.mjs.

Find concrete defects that could produce a false passing fix, lose evidence, modify a source checkout, mishandle cancellation, or leave an operation stuck. Check whether changing a proposed patch invalidates trust and whether readiness is distinguished from a confirmed culprit. Prefer one or two meaningful regressions over duplicating the existing suite.

Do not modify implementation files. Create only test/copilot.test.mjs and evidence/COPILOT_REVIEW.md. Use Node builtins and installed project dependencies only; no installations, pushes, external shell/network requests, or reading .env files, credentials or unrelated directories. The application may create its own normal disposable test checkouts.

Run node --test test/copilot.test.mjs. Record exact findings, affected files/lines, commands, observed results and suggested fixes in the review file. Clearly report failing tests; do not weaken them to force a pass. If you find no defect, report that honestly. Do not invent results, contribution claims or success metrics. Finish within one focused review pass.

The builder will inspect your findings, implement justified fixes and rerun the full suite. Your review and tests provide the attributable Copilot contribution; no contribution is claimed until this session actually happens.
