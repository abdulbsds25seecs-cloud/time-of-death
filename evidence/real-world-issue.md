# Regression: break: include "exports" map w/ "types" conditions (#57)

## Observed behavior
The supplied check fails at 3ec8e9fa2f6eef3911cb47f656ab761fc1030812 and passes at its parent 4a4eadd3e492b882e59112b453f86e83316b7133.

## Reproduction
Repository: clsx
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
Case e2f7b9d1-1603-4da5-92cd-e2a08fe0e21b; status complete; 14 check executions; 2 execution(s) per selected revision.
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
3ec8e9fa2f6eef3911cb47f656ab761fc1030812; bad; exit 1; 78 ms.
```text
PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-AP1y2G\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-AP1y2G\checkout\.tod-manifest-probe\probe.cjs
```

### E12: Confirm candidate failure
3ec8e9fa2f6eef3911cb47f656ab761fc1030812; bad; exit 1; 75 ms.
```text
PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-AP1y2G\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-AP1y2G\checkout\.tod-manifest-probe\probe.cjs
```

### E13: Confirm previous revision passes
4a4eadd3e492b882e59112b453f86e83316b7133; good; exit 0; 107 ms.
```text
PASS: clsx/package.json resolves for downstream tooling
```

### E14: Confirm previous revision passes
4a4eadd3e492b882e59112b453f86e83316b7133; good; exit 0; 84 ms.
```text
PASS: clsx/package.json resolves for downstream tooling
```

## Proposed fix verification
Status: passed
The parent passes, the culprit fails, and the proposed fix passes on the recorded repeated checks.
- Passing parent: good; revision 4a4eadd3e492b882e59112b453f86e83316b7133; evidence V1, V2
- Original culprit: bad; revision 3ec8e9fa2f6eef3911cb47f656ab761fc1030812; evidence V3, V4
- Proposed fix: good; revision 3ec8e9fa2f6eef3911cb47f656ab761fc1030812 with proposed patch; evidence V5, V6
Verifies only the supplied regression check. Passing does not prove a complete or semantically correct fix. Review changes to tests and dependencies.

## Limits
The boundary assumes a reproducible monotonic regression in the selected linear history. It does not establish semantic root cause. Logs and patches can contain sensitive material; review this draft before posting. No issue has been published by this export.