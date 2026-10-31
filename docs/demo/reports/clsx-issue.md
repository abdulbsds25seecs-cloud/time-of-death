# Regression: break: include "exports" map w/ "types" conditions (#57)

## Observed behavior
The supplied check fails at 3ec8e9fa2f6eef3911cb47f656ab761fc1030812 and passes at its parent 4a4eadd3e492b882e59112b453f86e83316b7133.

## Reproduction
Repository: recorded-public-clsx-checkout
Working revision: 6da37d67472ea9eb177a4ea9a9fa2f3f4a3c445e
Failing revision: 6232a9e5649143a28419a04f786a15f63a0b7edd
```text
Portable Node regression check (injected into every revision)
```
Portable check used in every revision:
```js
// Reconstructed downstream compatibility check, not an upstream clsx test.
// Uses the historical manifest with Node's real package resolver. No install,
// build, upstream lifecycle script or third-party executable is needed.
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const probe=path.resolve('.tod-manifest-probe');
await mkdir(path.join(probe,'node_modules','clsx'),{recursive:true});
await writeFile(path.join(probe,'node_modules','clsx','package.json'),await readFile('package.json','utf8'));
try{
  const require=createRequire(path.join(probe,'probe.cjs'));
  const resolved=require.resolve('clsx/package.json');
  if(!resolved.endsWith('package.json'))throw new Error('Unexpected resolution');
  console.log('PASS: clsx/package.json resolves for downstream tooling');
}catch(error){console.error(`PACKAGE_MANIFEST_ACCESS: ${error.code||error.name}: ${error.message}`);process.exitCode=1;}
```

## Recorded evidence
Case 4ca744a8-ef48-49b4-9007-07e9b9aecce4; status complete; 14 check executions; 2 execution(s) per selected revision.
Candidate: 3ec8e9fa2f6eef3911cb47f656ab761fc1030812
Passing parent: 4a4eadd3e492b882e59112b453f86e83316b7133

### Candidate diff
```diff
diff --git a/clsx.d.mts b/clsx.d.mts
new file mode 100644
index 0000000..2220c93
--- /dev/null
+++ b/clsx.d.mts
@@ -0,0 +1,6 @@
+export type ClassValue = ClassArray | ClassDictionary | string | number | null | boolean | undefined;
+export type ClassDictionary = Record<string, any>;
+export type ClassArray = ClassValue[];
+
+export function clsx(...inputs: ClassValue[]): string;
+export default clsx;
diff --git a/clsx.d.ts b/clsx.d.ts
index f557360..b86650a 100644
--- a/clsx.d.ts
+++ b/clsx.d.ts
@@ -1,6 +1,10 @@
-export type ClassValue = ClassArray | ClassDictionary | string | number | null | boolean | undefined;
-export type ClassDictionary = Record<string, any>;
-export type ClassArray = ClassValue[];
+declare namespace clsx {
+	type ClassValue = ClassArray | ClassDictionary | string | number | null | boolean | undefined;
+	type ClassDictionary = Record<string, any>;
+	type ClassArray = ClassValue[];
+	function clsx(...inputs: ClassValue[]): string;
+}

-export declare function clsx(...inputs: ClassValue[]): string;
-export default clsx;
+declare function clsx(...inputs: clsx.ClassValue[]): string;
+
+export = clsx;
diff --git a/package.json b/package.json
index 8f2f743..bf411e9 100644
--- a/package.json
+++ b/package.json
@@ -1,13 +1,23 @@
 {
   "name": "clsx",
   "version": "1.2.1",
   "repository": "lukeed/clsx",
   "description": "A tiny (228B) utility for constructing className strings conditionally.",
-  "module": "dist/clsx.m.js",
+  "module": "dist/clsx.mjs",
   "unpkg": "dist/clsx.min.js",
   "main": "dist/clsx.js",
+  "exports": {
+    "import": {
+      "types": "./clsx.d.mts",
+      "default": "./dist/clsx.mjs"
+    },
+    "default": {
+      "types": "./clsx.d.ts",
+      "default": "./dist/clsx.js"
+    }
+  },
   "types": "clsx.d.ts",
   "license": "MIT",
   "author": {
     "name": "Luke Edwards",
     "email": "luke.edwards05@gmail.com",

```

### E11: Confirm candidate failure
3ec8e9fa2f6eef3911cb47f656ab761fc1030812; bad; exit 1; 97 ms.
```text
PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in [recording-machine path removed]
```

### E12: Confirm candidate failure
3ec8e9fa2f6eef3911cb47f656ab761fc1030812; bad; exit 1; 133 ms.
```text
PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in [recording-machine path removed]
```

### E13: Confirm previous revision passes
4a4eadd3e492b882e59112b453f86e83316b7133; good; exit 0; 98 ms.
```text
PASS: clsx/package.json resolves for downstream tooling
```

### E14: Confirm previous revision passes
4a4eadd3e492b882e59112b453f86e83316b7133; good; exit 0; 81 ms.
```text
PASS: clsx/package.json resolves for downstream tooling
```

## Proposed fix verification
Status: passed
The parent passes, the culprit fails, and the proposed fix passes on the recorded repeated checks.
- Passing parent: good; revision 4a4eadd3e492b882e59112b453f86e83316b7133; evidence V1, V2
- Original culprit: bad; revision 3ec8e9fa2f6eef3911cb47f656ab761fc1030812; evidence V3, V4
- Proposed fix: good; revision 3ec8e9fa2f6eef3911cb47f656ab761fc1030812 with proposed patch; evidence V5, V6
Verifies only the supplied regression check, not semantic correctness. Portable checks are injected after applying the proposal; keep their check logic independent of changed application code. Command proposals are restricted to the original culprit change set and cannot change the entry check or recognized test/configuration paths. This conservative scope guard is not a proof of the full JavaScript dependency graph or a tamper-proof sandbox.
Check integrity: injected. The recorded portable check is injected after the proposal, using the same script for all three variants.

## Limits
The boundary assumes a reproducible monotonic regression in the selected linear history. It does not establish semantic root cause. Logs and patches can contain sensitive material; review this draft before posting. No issue has been published by this export.