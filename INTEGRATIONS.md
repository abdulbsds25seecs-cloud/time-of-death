# Optional integrations

Standard mode stays local and loads none of these SDKs. All are optional. Install the source dependencies with `npm ci` before enabling them. Copy `.env.example` to `.env.local`; the local file is ignored by Git. The Windows launcher reads it. From a terminal:

```powershell
node --env-file-if-exists=.env.local server.mjs
```

## Mastra: a reviewable autopsy workflow

Set `TOD_MASTRA=1`. An autopsy uses Mastra's actual `createWorkflow`/`createStep` execution engine:

1. `collect-evidence` prepares the bounded diff and candidate/parent execution receipts.
2. `local-model` calls the installed Ollama model with a JSON output schema.
3. `validate-citations` rejects findings that cite nonexistent evidence.

The workflow record appears in the interface and exports. It does not execute model suggestions. Citation validation does not guarantee correct reasoning. No Mastra Cloud account or hosted model API is used. Clear the setting for the smaller direct execution path.

Verification: `node scripts/verify-autopsy.mjs` uses a completed **synthetic** case, the installed `qwen2.5-coder:1.5b` model, and a local Sentry test transport. It writes real output to `evidence/mastra-local-autopsy.json` and `evidence/sentry-local-envelopes.json`. The latter is not evidence of cloud delivery.

## Temporal: survive a stopped worker

Install the native [Temporal CLI](https://temporal.io/setup/install-temporal-cli) from the official distribution. No Docker, WSL or Temporal Cloud account is required for this local setup. In three terminals:

```powershell
# Terminal 1: persistence requires --db-filename; keep this file.
temporal server start-dev --db-filename .data/temporal.db --headless

# Terminal 2
npm run worker

# Terminal 3
npm run durable -- --demo
```

Run the normal web app and open **Case archive** to view the durable case. Reload or reopen the archive to discover a newly created case. An open durable case refreshes every two seconds. The workflow ID printed by the CLI is also the report ID. Closing the starting CLI does not cancel the workflow; rejoin with:

```powershell
npm run durable -- --result YOUR-WORKFLOW-ID
```

For a trusted real repository, replace `--demo` with a JSON configuration file:

```json
{
  "repo": "C:/Projects/my-app",
  "good": "HEAD~20",
  "bad": "HEAD",
  "command": "node check.mjs",
  "repeats": 2,
  "timeoutMs": 30000,
  "model": "qwen2.5-coder:1.5b"
}
```

An optional `reproScript` string replaces `command`. `model` is optional. `TOD_MASTRA=1` and `SENTRY_DSN` apply to the worker too, so the durable investigation can run the Mastra autopsy and emit Sentry spans.

Temporal durably schedules and retries an investigation Activity. Completed execution results are atomically checkpointed under `.data/durable/<workflow-id>/`. On retry, the Activity reconstructs the Git search in a fresh clone and reuses those receipts. The worker runs one Activity at a time. Keep the same machine, source repository, checkpoint files and Temporal database. This is recovery from process interruption, not disk-loss recovery or remote worker migration. Checks are not exactly-once: a crash before a result is checkpointed can cause that check to repeat. A hard kill can leave a disposable checkout in the system temp directory. The ordinary web-mode investigation is not made durable by merely starting the Temporal service.

Verification, with the service running and **all other Time of Death workers stopped**:

```powershell
node scripts/verify-recovery.mjs
```

This launches its own worker, deliberately kills it after three checkpointed checks, restarts it and verifies the known demo boundary. The recorded run reused three checks and confirmed the expected commit on Activity attempt 2. See `evidence/temporal-recovery.json`. Use **Cancel investigation** on an open durable case for cancellation; closing a terminal only detaches.

## Sentry: your free project setup

Create a free Sentry project using the **Node.js** platform and a name such as `time-of-death`. Copy its **DSN** from Project Settings → Client Keys (DSN) into `.env.local`:

```dotenv
SENTRY_DSN=https://YOUR-PUBLIC-KEY@YOUR-INGEST-HOST/YOUR-PROJECT-ID
TOD_MASTRA=1
```

No Sentry auth token is needed for runtime traces. Restart the web server or worker, then run a synthetic investigation and generate an autopsy. In Sentry, look for the `Regression investigation`, `Evidence autopsy workflow`, `local-model` and revision-check spans. Free plans have quotas; enabling this does not require buying a paid plan. Leave the DSN blank to disable it completely.

Only static operation names, allowlisted model names, durations, exit codes, output-token counts and check counts are instrumented. Automatic integrations are disabled. Prompts, model responses, diffs, repository paths, check commands, stdout/stderr, machine hostnames and user identity are excluded from the instrumentation. Source maps and private files are not uploaded. `sendDefaultPii` is false. These metadata spans leave the machine only when a DSN is configured.

Current evidence: the actual Sentry Node SDK emitted nested spans into an in-memory transport; privacy assertions passed. Controlled synthetic setup spans were subsequently verified in the live project dashboard; see `evidence/SENTRY_LIVE_VERIFICATION.md` and its screenshot. This proves cloud ingestion for those setup spans, not a full real-model investigation trace.
