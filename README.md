# Time of Death

**Find the commit that broke your app. Follow the evidence.**

A free local regression investigator with an interactive Git timeline, execution receipts, portable regression scripts, and optional local open-weight AI autopsies. The prebuilt edition needs Node 22.13+ and Git. Building from source also needs npm. No account, Docker, paid API, or cloud service is required for the standard local mode.

> Implemented: React coroner's console, fixed Bayer dithering, engine/CLI, reports, optional Mastra workflow, Temporal recovery and opt-in Sentry instrumentation. Local verification includes the acceptance suite and a separate forced-worker-crash recovery check; see evidence/acceptance-tests.txt for the latest counts. Copilot supplied independent bug reproducers, now preserved with the fixes. Controlled synthetic spans were verified in the live Sentry dashboard; a real-model cloud trace and public publication remain separate work.

## Start

From source, run these once:

```powershell
npm ci
npm run build
```

The prebuilt edition already contains `dist/` and does not need these commands for standard mode.

```powershell
node server.mjs
```

Open **http://127.0.0.1:4317**. On Windows, you can also double-click `Start-Time-of-Death.cmd`. Keep the terminal running. Set `PORT` to choose another local port.

Choose **Open the synthetic case**, then **Begin investigation**. This creates a real, explicitly synthetic Git repository and searches for a deliberately introduced session-expiration regression. The timeline and logs come from actual checks.

## Investigate your project

1. Choose an absolute path to a **trusted** local Git repository.
2. Supply a working revision and a later failing revision on a linear history.
3. Enter a reproducible command. Historical dependencies are **not installed automatically**. Prefer a focused, self-contained check.
4. Optionally specify text that must appear in failing output. Other failures are skipped.
5. Inspect the candidate, its passing parent, their diff, and every captured check.

The source working tree is not switched, stashed, cleaned, or reset. A disposable clone contains committed files only. Ignored dependencies, `.env` files, and uncommitted work are not copied. Checks run sequentially in that clone, with timeouts and bounded output. These commands execute with your account's permissions: a disposable clone is **not a security sandbox**.

### A test that did not exist in older commits

Open **Replay a new check in old revisions** and paste a Node ESM script. It replaces the command field and is injected into each checked revision. Relative imports resolve against that revision.

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

Keep Ollama running. Use **Refresh model status** if needed; an autopsy is requested after a conclusive investigation when a local model is available. Local inference sends the bounded diff/log evidence to the configured Ollama server. The default endpoint is on this computer, `http://127.0.0.1:11434`. `qwen2.5-coder:1.5b` is another tested option; review either model's output.

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

Cases are saved under `.data/reports/` when started and as execution progresses, and shown in the case archive. Normal shutdown cancels active local work and waits for its final report. After an abrupt process exit, a saved unfinished case opens as interrupted; ordinary mode does not resume it automatically. Markdown and JSON exports contain execution output, paths, and optionally the portable script and AI evidence packet. They can contain sensitive information. Review exports before sharing. `.data/` and `.env.local` are gitignored. Fonts are bundled locally. Sentry is disabled unless a DSN is configured; see the optional integration guide for precisely what it sends.

## Check readiness, verify a fix, export an issue draft

Use **Check readiness** to run only the working/failing endpoint checks before searching. It diagnoses missing check files, unavailable dependencies, unstable outcomes and timeouts. Historical package scripts are read as suggestions; nothing is installed or run just because it appears in a manifest. A ready result does not declare a candidate commit.

After a conclusive investigation, **Did the fix work?** accepts a unified patch or a descendant fix revision. It reruns the passing parent, original culprit and proposed fix in a disposable checkout. A passing result has actual pass/fail/pass receipts. Your source working files are not changed. For command-based verification, use a direct `node check.mjs` command. Changes to that entry point or recognized test/configuration files block a passing verdict. Other shell commands (including npm scripts) require rerunning the investigation with a portable check. Portable scripts are injected after the proposal for all three variants. The result records a check fingerprint and integrity explanation. These controls do not prove semantic correctness or protect against arbitrary malicious code; review imported helpers and dependency behavior.

**Export bug report** produces a local Markdown draft with reproduction steps, candidate/parent evidence and the fix verification record. It never posts an issue. JSON and full Markdown exports also retain the new receipts.

## Automated demonstration and release preparation

See [AUTOMATION.md](AUTOMATION.md). `npm run demo:real` reconstructs a downstream package-manifest compatibility check against pinned public clsx history, finds its boundary and verifies a compatibility patch. The upstream exports-map change was intentional; this example is not a claim of a newly discovered upstream defect or a personal production incident. It uses Node's real resolver with a minimal layout containing the historical manifest, without installing/building clsx.

`npm run prepare:submission` runs checks, refreshes demonstration evidence and article metrics, and prepares a prebuilt release. Optional flags manage a local Temporal fault experiment and render an offline narrated walkthrough. Account setup and public posting remain separate. No script buys credits or publishes artifacts.

## Optional integrations

See [INTEGRATIONS.md](INTEGRATIONS.md) for setup and verification. All three can be combined, but standard mode does not load their SDKs.

- **Mastra:** schema-checked evidence collection, local inference and citation validation. Set `TOD_MASTRA=1` after installing dependencies.
- **Temporal:** a separate durable CLI/worker mode; retries after worker failure reuse completed local check checkpoints. A local SQLite-backed Temporal service requires no cloud account. An in-flight check can repeat.
- **Sentry:** opt-in model/check timings, token counts and status spans. Prompts, source, commands, repository paths and captured logs are excluded. Controlled synthetic setup spans were verified in the live dashboard; see `evidence/SENTRY_LIVE_VERIFICATION.md`. This is separate from a real-model end-to-end trace.

On a modest laptop, use standard mode first. Temporal adds a service and worker. Do not run a durable investigation alongside a separate web investigation on the same small machine.

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

Time of Death source is MIT licensed. [Git](https://git-scm.com/) is separately licensed under GPLv2; [Node.js](https://nodejs.org/) and [Ollama](https://github.com/ollama/ollama) have their own licenses. Gemma is **open-weight**, subject to [Google's Gemma terms](https://ai.google.dev/gemma/terms), and is not relicensed by this project. Models and third-party binaries are not bundled. IM Fell English and IBM Plex Mono font licenses are included in `licenses/`; dependency packages retain their respective licenses.

The real-history demonstration uses [clsx](https://github.com/lukeed/clsx), MIT licensed by Luke Edwards. Its license is included in `licenses/clsx-MIT.txt`; downloaded history is not bundled. The portable check and proposed compatibility patch are demonstration artifacts, not an upstream endorsement.

AI coding assistance: Codex was used to build and verify this project. Copilot supplied three review reports and three regression test files, including reproductions of test-replacement false positives and lost shutdown reports. Their assertions remain intact. See `evidence/REVIEW_RESOLUTION.md` for the resulting fixes, fresh validation and remaining limits.
