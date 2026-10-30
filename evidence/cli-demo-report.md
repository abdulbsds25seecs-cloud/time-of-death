# Time of Death — investigation b28100c2-0ec4-4be2-834c-9d7cb2e83f7d

Status: **complete**
Created: 2026-10-30T14:54:58.023Z
Repository: C:/Users/oasis/Documents/Codex/2026-10-27/hac/outputs/time-of-death/.data/demo-repository
Check: node check.mjs
Elapsed: 6.33 seconds

## Verdict
First failing boundary in the selected linear range, assuming a reproducible monotonic regression.

Candidate: 67c6438a85566156c2a233beac616bf19e5e50d4
Passing parent: 4e1d65e8d0cb9dd25858443bfa73311d402ba1e5
Check executions: 8; distinct revisions: 6; selected history: 24

## Candidate diff [D1]
```text
diff --git a/notes.md b/notes.md
index 0d2f604..a2250bb 100644
--- a/notes.md
+++ b/notes.md
@@ -1,5 +1,5 @@
 # Session service
 
-Synthetic demonstration repository. Revision 14.
+Synthetic demonstration repository. Revision 15.
 
-Refactor expiration comparison
+Allow boundary timestamp in session check
diff --git a/session.mjs b/session.mjs
index 958a04a..0fd8079 100644
--- a/session.mjs
+++ b/session.mjs
@@ -1,4 +1,4 @@
 // Epoch timestamps use the same units. Sessions expire at expiresAt.
 export function sessionIsValid(now, expiresAt) {
-  return now < expiresAt;
+  return now <= expiresAt;
 }

```

## AI explanation
Not generated. No AI output is implied.

## Execution evidence

### E1 — eb6a356 — good
Verify working endpoint; repeat 1; exit 0; 434 ms
```text
PASS: all 3 session boundary checks


```

### E2 — 028b26b — bad
Verify failing endpoint; repeat 1; exit 1; 137 ms
```text

node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: A session at its exact expiration must be rejected

true !== false

    at file:///C:/Users/oasis/AppData/Local/Temp/time-of-death-ocIBBY/checkout/check.mjs:3:8
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:661:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: true,
  expected: false,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.14.0

```

### E3 — 695a803 — good
Narrowing the revision range; repeat 1; exit 0; 115 ms
```text
PASS: all 3 session boundary checks


```

### E4 — 7b84f07 — bad
Narrowing the revision range; repeat 1; exit 1; 143 ms
```text

node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: A session at its exact expiration must be rejected

true !== false

    at file:///C:/Users/oasis/AppData/Local/Temp/time-of-death-ocIBBY/checkout/check.mjs:3:8
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:661:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: true,
  expected: false,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.14.0

```

### E5 — 67c6438 — bad
Narrowing the revision range; repeat 1; exit 1; 126 ms
```text

node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: A session at its exact expiration must be rejected

true !== false

    at file:///C:/Users/oasis/AppData/Local/Temp/time-of-death-ocIBBY/checkout/check.mjs:3:8
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:661:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: true,
  expected: false,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.14.0

```

### E6 — 4e1d65e — good
Narrowing the revision range; repeat 1; exit 0; 103 ms
```text
PASS: all 3 session boundary checks


```

### E7 — 67c6438 — bad
Confirm candidate failure; repeat 1; exit 1; 132 ms
```text

node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: A session at its exact expiration must be rejected

true !== false

    at file:///C:/Users/oasis/AppData/Local/Temp/time-of-death-ocIBBY/checkout/check.mjs:3:8
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:661:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: true,
  expected: false,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.14.0

```

### E8 — 4e1d65e — good
Confirm previous revision passes; repeat 1; exit 0; 125 ms
```text
PASS: all 3 session boundary checks


```

## Boundaries
Assumes a reproducible good-to-bad transition on a linear history. Skips can make a result ambiguous. A candidate boundary is not proof of the semantic root cause. Disposable checkout isolation is not a security sandbox. Git bisect performs the search. Local AI provides optional hypotheses.