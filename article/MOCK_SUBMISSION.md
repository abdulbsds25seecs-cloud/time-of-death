---
title: "I Built a Coroner for Broken Builds. Copilot Caught Its False Alibi."
published: false
tags: devchallenge, hf26challenge, git, opensource
---

<!-- REVIEW COPY, October 31. Not published. Follows the supplied official template; The optional My Agent Session is omitted because there is no saved DevRelay session. The Spirit of It describes the author's stated motivation. Uses public repository image URLs for DEV preview; check their rendering before publishing. -->

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)*

## What I Built

I built **Time of Death**, a local tool that searches Git history for the boundary between a passing check and a failing one. It keeps the command output, confirms the candidate against its passing parent, and gives a local open-weight model those receipts to examine.

I built it because working with AI agents left me wanting a quicker way to check their explanations when something broke.

Give the app a trusted repository, a known working revision, a later failing revision and a repeatable check. **Check readiness** tests the endpoints first. **Begin investigation** searches the history with Git bisect and records every execution.

The console lets you inspect the candidate diff, select individual check receipts, reopen saved cases and export Markdown, JSON or a bug-report draft. A proposed patch can be replayed against the same failure. Your source working tree stays in place; execution happens in a disposable clone of committed files.

The [source and prebuilt preview](https://github.com/abdulbsds25seecs-cloud/time-of-death) contain the tool, the checks and the recorded experiments. Standard mode needs Node.js 22.13+ and Git. Local AI is optional, and its explanation is labeled as a hypothesis.

## Demo

This runs as a local developer tool. The [prebuilt preview](https://github.com/abdulbsds25seecs-cloud/time-of-death/releases/tag/v0.2.0-preview.20261031) lets you try it without installing npm dependencies in standard mode. The screenshots below show its actual interface and saved execution results.

For a concrete example, one line can turn a dependency upgrade into a debugging session:

```js
require.resolve('clsx/package.json');
```

With an older package manifest, that check passes. After an exports map is introduced, Node reports `ERR_PACKAGE_PATH_NOT_EXPORTED`. The class-name function still has nothing to do with the failure. The question is which change stopped exposing that package subpath.

I reconstructed a downstream compatibility check against nine commits from public clsx history. The probe uses Node's real package resolver with the historical manifest in a minimal package layout. It does not install or build clsx.

![Time of Death displaying a confirmed clsx boundary and its history.](https://raw.githubusercontent.com/abdulbsds25seecs-cloud/time-of-death/main/docs/screenshots/04-confirmed-boundary.jpg)

The console identifies `3ec8e9f` as failing and its parent `4a4eadd` as passing. These screenshots show an earlier saved run of the same case; the latest measurements below come from a fresh run on October 31.

![The selected execution receipt includes actual stderr and report export controls.](https://raw.githubusercontent.com/abdulbsds25seecs-cloud/time-of-death/main/docs/screenshots/05-receipts-and-export.jpg)

The package-path error is captured output. Each receipt records the revision, exit code and duration, so a reader can inspect what actually ran. Untested commits remain distinct from tested ones.

The latest Windows desktop run used two executions per selected revision:

| Observation | Recorded result |
| --- | --- |
| Selected history | 9 commits |
| Investigation | 14 checks across 5 distinct revisions |
| Candidate / passing parent | `3ec8e9f` / `4a4eadd` |
| Investigation time | 4.630 seconds, excluding AI inference |
| Demonstration compatibility patch | 6 checks: parent good, culprit bad, proposal good |

That timing describes a small manifest-resolution experiment. It is not a benchmark for application builds. The [upstream change](https://github.com/lukeed/clsx/commit/3ec8e9fa2f6eef3911cb47f656ab761fc1030812) was intentional and marked breaking; this is a compatibility demonstration, not a newly discovered upstream defect or a personal production incident.

![A proposed compatibility patch has parent-good, culprit-bad and proposal-good receipts.](https://raw.githubusercontent.com/abdulbsds25seecs-cloud/time-of-death/main/docs/screenshots/06-fix-verification.jpg)

The patch passes this particular check. That does not establish a complete upstream fix. The [portable probe](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/examples/clsx-package-exports-check.mjs) and [recorded case](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/real-world-case.md) make the experiment inspectable.

### Try the demo locally

The prebuilt edition needs Node.js 22.13+ and Git. Extract the entire ZIP from the [preview release](https://github.com/abdulbsds25seecs-cloud/time-of-death/releases/tag/v0.2.0-preview.20261031), then open `Start-Time-of-Death.cmd` on Windows. Standard mode needs no npm install. On other platforms, run `node server.mjs` in the extracted folder.

Open the printed loopback address, choose **Open the synthetic case**, then **Begin investigation**. That case creates real Git commits around a deliberately introduced session-expiration regression and is labeled synthetic throughout.

To build from source instead:

```powershell
git clone https://github.com/abdulbsds25seecs-cloud/time-of-death.git
cd time-of-death
npm ci
npm run build
npm start
```

To reproduce the historical compatibility experiment after installing source dependencies:

```powershell
npm run demo:real
```

Pick one failure you can repeat and two revisions you can defend. Let the case file show what changed, then read the explanation with the receipts beside it.

## Code

[Browse the public MIT-licensed repository](https://github.com/abdulbsds25seecs-cloud/time-of-death), including the application, portable check, tests and recorded evidence.

{% github https://github.com/abdulbsds25seecs-cloud/time-of-death %}

## How I Built It

The frontend uses React and Vite; a local Node.js server handles Git operations, case storage and report exports. Git bisect searches a validated linear history in a disposable clone. Repeated checks and candidate/parent confirmation supply the execution evidence before a model interprets it.

The AI autopsy runs through Ollama with an open-weight model. The fresh recorded workflow used Qwen2.5-Coder 1.5B on the CPU, with Mastra coordinating evidence collection, inference and citation validation. This is where AI contributes: it reads the bounded diff and logs, proposes explanations and suggests next checks. The case file keeps that prose separate from the observed pass/fail results.

### The false alibi Copilot found

I used Codex to build the project and GitHub Copilot to challenge it with bug reports and executable reproducers. The most useful finding was a passing fix verdict that should never have been trusted.

A proposal could leave `check.mjs` untouched while changing an imported helper to exit successfully. The receipts were real: good, bad, good. But the proposal had weakened the check instead of repairing the application.

The current guard blocks command proposals that change the check entry, recognized test/configuration paths, or any file outside the original culprit's change set. That blocks Copilot's helper reproducer regardless of the helper's filename. The original assertion remains unchanged and now passes.

This is a conservative restriction, not a proof of the entire JavaScript dependency graph. Accepted command replays are explicitly labeled `restricted`. For a broader patch, use a portable check whose assertion logic stays independent of the modified application. The app injects that recorded script after applying the proposal.

The fresh local suite finished with **51 tests passed, zero failed**. A separate HTTP journey exercised readiness, investigation, fix replay, all three exports and reopening after restart. React DOM tests covered all nine tour steps, focus trapping, dismissal, replay and blocked browser storage. Fresh complete visual browser/mobile acceptance remains unfinished; DOM tests do not establish pixel layout.

### Frameworks with a specific job

**Mastra** runs the autopsy as three steps: collect evidence, call the local model, validate citation identifiers. In the fresh real-history run, Qwen2.5-Coder 1.5B produced 301 tokens in 53.077 seconds on this Windows desktop's CPU. Git checks finish before inference begins, avoiding concurrent build and model work on a modest machine.

The model also made a useful mistake to preserve: it described the older passing parent as a revision that “resolved” the failure. That reverses the chronology. Citation validation accepted real revision identifiers; it did not establish a true explanation. The raw response and review remain in the evidence directory. The execution boundary is more dependable than that sentence.

**Sentry** received the real investigation/model trace through the SDK transport, which returned HTTP 200 for a transaction with 14 child spans. The telemetry filter excludes source, prompts, repository paths, commands and captured logs. This establishes delivery acknowledgement; I have not visually checked that new trace in the dashboard. Tracing is opt-in and standard mode needs no Sentry account.

**Temporal** supports a separate local durable worker mode. In a fresh experiment, I force-killed the worker after three completed check checkpoints, restarted it against the same SQLite-backed service, and observed all three reused before the expected boundary was confirmed. An in-flight check may repeat. This does not test disk loss or remote worker migration.

**GitHub Copilot** supplied independent reports and regression tests, including the false-alibi case above. The repository preserves those reports rather than rewriting their original failing results. The [latest evidence index](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/FINAL_ACCEPTANCE.md) links the fresh results and distinguishes them from earlier experiments.

### What still needs a human

The check must describe the behavior you care about. A confirmed boundary means the candidate fails while its parent passes on that check, assuming a repeatable good-to-bad transition. It does not prove semantic root cause. Histories containing merges or more than 500 selected revisions are rejected; flaky outcomes and untestable commits can leave the case inconclusive.

A disposable clone is not a security sandbox. Run trusted repositories and commands. Dependencies are not installed automatically, and exports can contain paths and logs, so review them before sharing. Generated next-check suggestions are never executed automatically.

## Why Does Open Innovation Matter?

Git supplies the search algorithm. The project adds replaying new checks in old revisions, repeated outcomes, endpoint diagnosis, a visual case file and optional local interpretation. I have not invented bisection.

Ollama runs a replaceable local open-weight model against a bounded diff and confirmation logs. With the default local endpoint, that evidence stays on the machine. The Git result and exports work even when no model is available. Time of Death's source is MIT licensed; dependencies and models retain their own licenses and terms.

There is no paid inference API in this setup. Local execution still uses your hardware, and the models need an initial download. I already had Codex and Copilot subscriptions for development; those are not required to run the standard tool. A T480 with 8 GB RAM is a design target, not hardware on which I have measured performance.

Running the model locally makes it possible to examine a private repository's diff and logs without sending that evidence to a hosted inference API. I can inspect the workflow, replace the model, and keep the Git search and report format if a provider changes its service. A closed hosted API could provide an explanation, but would require sending the evidence to that service and depending on its availability and terms. The local setup can keep working offline after its tools and model have been downloaded; optional Sentry delivery needs a network connection.

## The Spirit of It

Working with AI coding agents was the reason this idea kept coming back to me. As the codebases I worked on grew, I found myself spending more time checking their explanations of what had broken. An explanation could sound convincing and still need verifying. I wanted to spend less time retracing changes and more time fixing the actual failure.

What I wanted was simple: show me the commit where the check changed, show me what ran, and let me test the proposed repair against the same failure. That frustration became the case file, the execution receipts and the fix replay.

The challenge came at the perfect time to make me stop procrastinating and actually build and test it. “Ghost in the Machine” fit the problem: an old change can keep haunting a program long after everyone has forgotten why it was made. Time of Death is my attempt to give that ghost a commit hash and something I can reproduce.

## Prize Categories

- **Best Use of GitHub Copilot:** independent adversarial testing and executable regression reproducers, including the imported-helper false pass. [Original report](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/COPILOT_RETEST_REPORT.md) and [current resolution](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/FINAL_ACCEPTANCE.md).
- **Best Use of Mastra:** the three-step local-model autopsy workflow. [Real workflow evidence](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/final-partner-run.json).
- **Best Use of Sentry Agent Tracing:** opt-in investigation and model spans, including timings and token counts. The fresh transaction received HTTP 200 with fourteen child spans; dashboard inspection of that new trace remains pending. [Trace delivery evidence](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/final-partner-run.json).
- **Best Use of Temporal:** durable worker recovery with three completed check checkpoints reused after a forced worker kill. [Fault-experiment evidence](https://github.com/abdulbsds25seecs-cloud/time-of-death/blob/main/evidence/temporal-recovery.json).
