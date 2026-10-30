# Time of Death

**Find the commit that broke your app. Follow the evidence.**

A free local regression investigator with an interactive Git timeline, execution receipts, portable regression scripts, and optional local open-weight AI autopsies. Node 22+ and Git are enough to investigate. No npm installation, account, Docker, paid API, or cloud service is required.

> Development status: engine and initial interface implemented. Frontend redesign is waiting for the user's reference document. Copilot review is pending CLI authentication. See evidence/ and PROJECT_PLAN.md for actual results and outstanding work.

## Start

```powershell
node server.mjs
```

Open **http://127.0.0.1:4317**. On Windows, you can also double-click `Start-Time-of-Death.cmd`. Keep the terminal running. Set `PORT` to choose another local port.

Choose **Load the 24-commit demo**, then **Start investigation**. This creates a real, explicitly synthetic Git repository and searches for a deliberately introduced session-expiration regression. The timeline and logs come from actual checks.

## Investigate your project

1. Choose an absolute path to a **trusted** local Git repository.
2. Supply a working revision and a later failing revision on a linear history.
3. Enter a reproducible command. Historical dependencies are **not installed automatically**. Prefer a focused, self-contained check.
4. Optionally specify text that must appear in failing output. Other failures are skipped.
5. Inspect the candidate, its passing parent, their diff, and every captured check.

The source working tree is not switched, stashed, cleaned, or reset. A disposable clone contains committed files only. Ignored dependencies, `.env` files, and uncommitted work are not copied. Checks run sequentially in that clone, with timeouts and bounded output. These commands execute with your account's permissions: a disposable clone is **not a security sandbox**.

### A test that did not exist in older commits

Open **Bring a new regression check into old commits** and paste a Node ESM script. It replaces the command field and is injected into each checked revision. Relative imports resolve against that revision.

```js
import assert from 'node:assert/strict';
import { sessionIsValid } from './session.mjs';

assert.equal(sessionIsValid(1000, 1000), false,
  'A session at its exact expiration must be rejected');
```

This is useful when you have written a regression test today and want to discover when its bug first appeared. The above script is specifically for the bundled synthetic demonstration.

### Exit codes and confidence

| Check result | Treatment |
| --- | --- |
| 0 | Good |
| 1–124 | Bad, subject to optional target-failure text |
| 125 | Untestable; Git bisect skips the revision |
| Timeout, abnormal execution | Investigation stops without a regression verdict |
| Different repeated outcomes | Inconclusive; potentially flaky check |

Missing-module errors are skipped by a limited heuristic. A precise target-failure string is preferable to relying on that heuristic. The default runs each selected revision twice. Repetition does not guarantee that a check is free of flakiness.

A confirmed result means the candidate fails and its parent passes on the supplied check, **under the assumption of a reproducible, monotonic good-to-bad transition**. It does not prove the semantic root cause. Multiple regressions and fixes can violate that assumption. Merge-containing ranges and histories exceeding 500 revisions are rejected in this version.

## Optional free local AI

Install [Ollama](https://ollama.com/download), then:

```powershell
ollama pull gemma3:1b
```

Keep Ollama running. Open **AI settings** to refresh model availability, then generate an autopsy after a conclusive investigation. Local inference sends the bounded diff/log evidence to the configured Ollama server. The default endpoint is on this computer, `http://127.0.0.1:11434`.

For an explicitly configured Ollama server on another machine, set `OLLAMA_BASE_URL` before starting the app. In that configuration, evidence is transmitted to that machine; it is no longer strictly on-device. Only use a server you trust. The app does not support Ollama cloud-model names and does not purchase credits.

The model produces a structured summary, evidence-linked hypotheses, and suggested next checks. Evidence identifiers are validated, but **valid citations do not establish semantic accuracy**. Small models can misread a change. A deterministic comparison witness is included when a simple changed return comparison can be parsed; other changes do not receive this witness. Generated suggestions are never executed automatically.

Inference uses four CPU threads, a 4,096-token context, and a 450-token output cap. The model is requested to unload after responding. An 8 GB, CPU-only laptop is a design target, **not hardware on which performance has yet been verified**. The target project's own builds can need much more memory than the tool.

Git search and report export remain available without a model. AI analysis is deferred until after the search so modest machines do not run the model and build checks concurrently.

### Setup on this development machine

The CPU-only Ollama runtime is at `Z:\Codex-time-of-death-runtime\cpu\ollama.exe`; model files are at `Z:\Codex-time-of-death-runtime\models`. These are local development paths, not requirements for other users. Ollama's own state may live in the user's `.ollama` folder. Nothing under these runtime paths should be included in the source release.

## CLI

```powershell
node cli.mjs --demo --output report.md
node cli.mjs --demo --model gemma3:1b --json --output report.json
node cli.mjs --repo C:\Projects\app --good HEAD~20 --bad HEAD --command "node check.mjs"
node cli.mjs --repo C:\Projects\app --good v1 --bad HEAD --check C:\Checks\regression.mjs
```

Run `node cli.mjs --help` for all options. Exit 0 means a boundary was confirmed; exit 2 means no conclusive result. AI errors remain separately labeled in the report.

## Reports and privacy

Completed cases are saved under `.data/reports/` and shown in the case archive. Markdown and JSON exports contain execution output, paths, and optionally the portable script and AI evidence packet. They can contain sensitive information. Review exports before sharing. `.data/` is gitignored. There are no external fonts, analytics, telemetry, or runtime npm packages.

## Verification

```powershell
npm test
npm run evaluate
```

These commands use Node's built-in test runner. Evaluation creates synthetic histories with known answers and writes `evidence/evaluation.json`. Timings include checks and Git operations; they do not include model inference. GitHub Actions is configured for Windows and Linux; remote CI results must be checked after publishing, and are not implied by local tests.

## Architecture

```text
Browser UI / CLI
      |
Node local investigator
      |-- validate endpoints -> disposable Git clone -> git bisect
      |-- capture checks -> confirm candidate/parent -> saved case
      `-- bounded evidence -> local Gemma -> reviewable hypotheses
```

Git performs the binary search. The project adds command replay, endpoint checks, repeated outcomes, evidence capture, a visual workflow, optional local AI interpretation, and portable reports. No claim is made to have invented bisection.

## Attribution and licenses

Time of Death source is MIT licensed. [Git](https://git-scm.com/) is separately licensed under GPLv2; [Node.js](https://nodejs.org/) and [Ollama](https://github.com/ollama/ollama) have their own licenses. Gemma is **open-weight**, subject to [Google's Gemma terms](https://ai.google.dev/gemma/terms), and is not relicensed by this project. Models and third-party binaries are not bundled.

AI coding assistance: Codex was used to build and verify this project. Copilot contributions must be documented only after an actual authenticated session. See `evidence/COPILOT_TASK.md` for the prepared review task; its existence is not proof that a Copilot review occurred.
