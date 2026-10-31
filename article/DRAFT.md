---
title: "Time of Death: I built a local coroner for broken builds"
published: false
tags: devchallenge, hf26challenge, git, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).*

<!-- Review draft. Use app screenshots as the main demo. Current-interface screenshots were captured on October 31, 2026. The repository is currently private; no DEV submission has been published. -->

This is a small line for an upgrade to break:

```js
require.resolve('clsx/package.json');
```

It resolves with the older manifest in my historical check. After an exports map is introduced, Node reports `ERR_PACKAGE_PATH_NOT_EXPORTED`. The library's class-name function is not involved in that failure.

I built **Time of Death** to turn a reproducible failure into a case file: which commit changed the result, what actually ran, what a local model thinks happened, and whether a proposed fix passes the same check.

The example below reconstructs a downstream compatibility check against real public history. It is not a personal production incident. The upstream change was deliberately marked breaking.

## What I Built

Time of Death runs locally against a trusted Git repository. You supply a working revision, a later failing revision, and a focused regression check.

**Check readiness** tests the endpoints before searching. It reports missing files, unavailable dependencies, inconsistent repeated results, and timeouts. Historical package scripts can be inspected as suggestions; they are not executed automatically.

The investigation uses Git bisect, records every execution, and confirms that the candidate fails while its parent passes. A local open-weight model receives the bounded diff and confirmation logs, returning hypotheses with evidence references.

**Verify a fix** accepts a patch or an existing fix revision. In a disposable checkout, it reruns the passing parent, original culprit, and proposal. **Export bug report** turns those receipts into a draft someone else can review. Nothing is posted automatically.

For the theme, the ghost is an old decision still affecting today's program. The coroner's console follows that history to an observed boundary. Its dithered field shows the remaining search interval, not a made-up probability.

## Demo

The walkthrough uses fresh still images of the current app. The historical investigation was reopened from its saved case file; its fourteen receipts and 4.212-second timing belong to the original execution. The report download was exercised through the UI during capture. Local Ollama was unavailable, so these images do not imply fresh AI inference.

![The app confirms candidate 3ec8e9f and its passing parent in the recorded clsx investigation.](../docs/screenshots/04-confirmed-boundary.jpg)

The timeline narrows to one boundary, and the candidate tag names the commit, author, date and observed failing status. Unexecuted revisions remain separate from tested ones.

![The app exposes captured package-path errors and prepares a bug-report download.](../docs/screenshots/05-receipts-and-export.jpg)

The execution panel retains stderr from the portable check. The export controls prepare a local report someone else can inspect; nothing is posted automatically.

![A compatibility patch produces recorded parent-good, culprit-bad and proposal-good checks.](../docs/screenshots/06-fix-verification.jpg)

The proposal passes this specific portable check. The current imported-helper integrity bug remains unresolved for command-based verification, so a green result must not be presented as a general proof of a correct fix.

![The tour spotlights the repository input while dimming the rest of the console.](../docs/screenshots/03-tour-spotlight.jpg)

The first-visit guide explains the workflow one section at a time. The header can reopen it. [The full screenshot gallery](../docs/SCREENSHOTS.md) also includes the welcome and local font choices.

<!-- Before DEV publication, upload these current screenshots and use their hosted image URLs. Keep the existing video as a separate artifact; it is not the main demo. -->

### A real historical compatibility break

The selected [clsx](https://github.com/lukeed/clsx) range runs from the 1.2.1 revision to the 2.0.0 revision. My portable check copies the historical `package.json` into a minimal package layout and asks Node's actual resolver to resolve `clsx/package.json`. It does not install clsx, run its build, or claim to reproduce every aspect of the released package.

The identified boundary is [3ec8e9f, the exports-map change](https://github.com/lukeed/clsx/commit/3ec8e9fa2f6eef3911cb47f656ab761fc1030812). The passing parent is `4a4eadd`. Node's [package entry-point documentation](https://nodejs.org/api/packages.html#package-entry-points) explains how an exports map restricts access to unlisted subpaths.

<!-- automation:real-world:start -->
The recorded historical run searched 9 commits and executed the check 14 times in 4.212 seconds, excluding AI inference. It identified `3ec8e9f`. Fix verification then ran 6 checks and recorded parent **good**, original culprit **bad**, proposed patch **good**. These are measurements of this reconstructed manifest-resolution check, not a general project benchmark.
<!-- automation:real-world:end -->

The proposed compatibility patch explicitly exports `./package.json` while preserving the existing root export conditions. It passes this check. That is a test result, not a recommendation that the upstream project should adopt the patch. Downstream tooling can also stop relying on an unexported package subpath.

## Code

Repository: [Time of Death on GitHub](https://github.com/abdulbsds25seecs-cloud/time-of-death) (currently private; public access is required before submission).

The source includes the portable historical check, automated reproduction script, acceptance tests, actual reports, and a prebuilt frontend. Standard local mode can run from the prebuilt package with Node 22.13+ and Git. Building from source uses:

```powershell
npm ci
npm run build
npm start
```

To reproduce the historical case, including readiness, bisection, fix verification, and the issue draft:

```powershell
npm run demo:real
```

That command downloads public Git history on first use. Subsequent investigations use the local copy. Ollama and model weights are separate installations.

## How I Built It

The backend uses Node's HTTP server and Git. React and Vite build the interface; IM Fell English and IBM Plex Mono are bundled locally. A fixed Bayer 8-by-8 matrix gives the timeline its two-color texture. Reduced motion, hidden tabs, and offscreen canvases are handled explicitly.

Git supplies the search algorithm. The project adds endpoint diagnosis, portable test replay, repeated checks, execution capture, a visual evidence workflow, local AI interpretation, fix verification, and reports. It does not invent a new bisection algorithm.

### Mastra: three steps I can inspect

The optional Mastra workflow runs `collect-evidence`, `local-model`, and `validate-citations`. Each step has schemas. The model is invoked through local Ollama, and findings citing nonexistent evidence are rejected. The case file includes the completed step record.

On the historical case, Qwen 2.5 Coder 1.5B took 50.669 seconds. Its summary connected the failure to the missing package-manifest export. I still needed the upstream commit message to explain that this was an intentional compatibility change, rather than label it an accidental upstream defect.

Small models were not consistently right. An earlier CPU-only Gemma 3 1B response took 54.322 seconds and read a synthetic comparison change in the wrong direction. Valid citation IDs did not make that reasoning correct. I retained the failed attempts and keep all model prose labeled as hypotheses. This development sequence is not a controlled model benchmark.

### Temporal: restart the worker without losing completed checks

Optional durable mode runs through a native local Temporal service backed by SQLite. An Activity records completed execution results on disk and can reconstruct the search after retry.

In the recorded fault test, the worker was force-stopped after three completed checks. Its replacement reused three checkpoints and confirmed the expected synthetic culprit on Activity attempt 2. This retained the machine, repository, checkpoint files and Temporal database. It does not establish disk-loss recovery or exactly-once execution: an in-flight check can run again.

### Sentry: observe the work without collecting source

Opt-in instrumentation records operation names, model names, durations, token counts, exit codes and check counts. Automatic integrations are disabled, and the instrumentation excludes prompts, model responses, diffs, commands, paths, captured logs and user identity.

The actual Sentry SDK emitted nested spans into a local test transport, including spans around a real local-model run. Controlled synthetic setup spans were subsequently verified in the live project dashboard. That proves ingestion for those setup spans, separately from a full real-model investigation trace. The local test envelopes alone do not establish cloud delivery.

### What the tests establish

The latest acceptance output is saved with the source. Tests exercise dirty source-tree preservation, invalid revisions, wrong endpoints, missing dependencies, skip ambiguity, unstable results, timeouts, cancellation, citation validation, request authorization, readiness, passing and failing fix proposals, and report export.

An earlier controlled evaluation used five synthetic histories with two executions per selected revision:

| Case | Selected commits | Observed result | Executions | Seconds |
| --- | ---: | --- | ---: | ---: |
| Early regression | 16 | Expected boundary | 16 | 6.895 |
| Middle regression | 24 | Expected boundary | 16 | 5.599 |
| Late regression | 24 | Expected boundary | 18 | 6.289 |
| No regression | 8 | Inconclusive | 4 | 1.808 |
| Skipped boundary | 8 | Inconclusive | 12 | 5.137 |

Those were Windows/Node 24.14.0 measurements on a Ryzen 5 3600 machine reporting six logical processors and 15.9 GiB RAM. Fixtures had no external package dependencies; model inference was excluded. Correct outcomes on these five cases do not establish arbitrary-repository accuracy.

## Why Does Open Innovation Matter?

A debugging packet can contain private source and internal logs. With the default local Ollama endpoint, the AI evidence stays on the machine. I can change models, inspect the workflow, retain the evidence independently, and use the tool without a per-request model API bill.

Git, the source code, and the optional open-source frameworks make the process inspectable. Open-weight models retain their own license terms; Gemma is not being relicensed by this project. The included fonts and third-party example retain their license notices.

The runtime uses no paid model API. Development used the coding-assistant subscriptions already available to me. Optional Sentry metadata tracing leaves the machine only when configured. Downloading dependencies, public history and model weights requires an initial connection.

A ThinkPad T480 with 8 GB RAM is a design target, not hardware I have benchmarked. Checks run sequentially; local inference follows the investigation and asks Ollama to unload the model afterward. Standard mode loads none of the optional framework SDKs. Temporal adds a service and worker, so it remains optional.

## Limits I Want the Reader to See

The selected range must be linear and at most 500 revisions. Bisection assumes a reproducible good-to-bad transition; bugs that disappear and return can violate that assumption. Historical dependencies are not installed automatically.

A disposable clone protects Git state, not arbitrary code execution. Users must trust the check and repository. Command verification now blocks proposals that change the direct Node check or recognized test/configuration paths. Shell wrappers require a portable check, injected after applying the proposal. Imported helpers and dependency behavior still need review: passing proves only what the recorded check establishes. Local AI output remains advice for review.

## My Agent Session

Codex helped implement and test the project. The repository preserves reproducible scripts and recorded outputs. Copilot supplied independent reviews and executable regression tests. It caught a proposed fix passing by replacing the test with `process.exit(0)`, and an active case disappearing during server shutdown. I preserved those failing assertions, added integrity checks and awaited shutdown persistence, then reran them. The original reports and a separate resolution record remain in the repository. No DevRelay session is claimed.

## Prize Categories

- **GitHub Copilot:** independent product/API testing, negative controls and regression reproducers that led to fixes for false passing verdicts and lost shutdown reports.
- **Mastra:** the schema-checked local-model autopsy workflow and recorded step results.
- **Temporal:** durable execution with an exercised worker-crash recovery path and explicit retry limits.
- **Sentry Agent Tracing:** metadata-only instrumentation, with live dashboard evidence for controlled synthetic setup spans. A full real-model cloud trace is a separate, unclaimed result.

Gemma was also exercised locally, with both its role and its failures documented. These descriptions report actual use; they do not guarantee category eligibility or an award.
