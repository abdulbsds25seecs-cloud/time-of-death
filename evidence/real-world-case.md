# Time of Death — investigation 215bb52d-1772-41a3-8fd3-900e314fa658

Status: **complete**
Created: 2026-10-31T05:41:40.249Z
Repository: C:/Users/oasis/Documents/Codex/2026-10-27/hac/outputs/time-of-death/.data/realworld/clsx
Check: Portable Node regression check (injected into every revision)
Elapsed: 5.18 seconds

## Verdict
First failing boundary in the selected linear range, assuming a reproducible monotonic regression.

Candidate: 3ec8e9fa2f6eef3911cb47f656ab761fc1030812
Passing parent: 4a4eadd3e492b882e59112b453f86e83316b7133
Check executions: 14; distinct revisions: 5; selected history: 9

## Candidate diff [D1]
```text
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

## Fix verification
Status: passed
The parent passes, the culprit fails, and the proposed fix passes on the recorded repeated checks.
- Passing parent: good; 4a4eadd3e492b882e59112b453f86e83316b7133; V1, V2
- Original culprit: bad; 3ec8e9fa2f6eef3911cb47f656ab761fc1030812; V3, V4
- Proposed fix: good; 3ec8e9fa2f6eef3911cb47f656ab761fc1030812 + patch; V5, V6
Verifies only the supplied regression check. Passing does not prove a complete or semantically correct fix. Review changes to tests and dependencies.

### V1 — Passing parent
good; exit 0; 258 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### V2 — Passing parent
good; exit 0; 156 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### V3 — Original culprit
bad; exit 1; 148 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-fix-7j0NYP\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-fix-7j0NYP\checkout\.tod-manifest-probe\probe.cjs

```

### V4 — Original culprit
bad; exit 1; 133 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-fix-7j0NYP\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-fix-7j0NYP\checkout\.tod-manifest-probe\probe.cjs

```

### V5 — Proposed fix
good; exit 0; 90 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### V6 — Proposed fix
good; exit 0; 77 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### Proposed change
```text
diff --git a/package.json b/package.json
index bf411e9..3944d2b 100644
--- a/package.json
+++ b/package.json
@@ -7,14 +7,17 @@
   "unpkg": "dist/clsx.min.js",
   "main": "dist/clsx.js",
   "exports": {
-    "import": {
-      "types": "./clsx.d.mts",
-      "default": "./dist/clsx.mjs"
+    ".": {
+      "import": {
+        "types": "./clsx.d.mts",
+        "default": "./dist/clsx.mjs"
+      },
+      "default": {
+        "types": "./clsx.d.ts",
+        "default": "./dist/clsx.js"
+      }
     },
-    "default": {
-      "types": "./clsx.d.ts",
-      "default": "./dist/clsx.js"
-    }
+    "./package.json": "./package.json"
   },
   "types": "clsx.d.ts",
   "license": "MIT",

```

## AI explanation
Not generated. No AI output is implied.

## Execution evidence

### E1 — 6da37d6 — good
Verify working endpoint; repeat 1; exit 0; 105 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### E2 — 6da37d6 — good
Verify working endpoint; repeat 2; exit 0; 90 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### E3 — 6232a9e — bad
Verify failing endpoint; repeat 1; exit 1; 97 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E4 — 6232a9e — bad
Verify failing endpoint; repeat 2; exit 1; 98 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E5 — 03e1cf9 — bad
Narrowing the revision range; repeat 1; exit 1; 118 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E6 — 03e1cf9 — bad
Narrowing the revision range; repeat 2; exit 1; 91 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E7 — 4a4eadd — good
Narrowing the revision range; repeat 1; exit 0; 126 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### E8 — 4a4eadd — good
Narrowing the revision range; repeat 2; exit 0; 113 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### E9 — 3ec8e9f — bad
Narrowing the revision range; repeat 1; exit 1; 177 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E10 — 3ec8e9f — bad
Narrowing the revision range; repeat 2; exit 1; 117 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E11 — 3ec8e9f — bad
Confirm candidate failure; repeat 1; exit 1; 73 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E12 — 3ec8e9f — bad
Confirm candidate failure; repeat 2; exit 1; 75 ms
```text

PACKAGE_MANIFEST_ACCESS: ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports" in C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\package.json imported from C:\Users\oasis\AppData\Local\Temp\time-of-death-zDrBVA\checkout\.tod-manifest-probe\probe.cjs

```

### E13 — 4a4eadd — good
Confirm previous revision passes; repeat 1; exit 0; 84 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

### E14 — 4a4eadd — good
Confirm previous revision passes; repeat 2; exit 0; 100 ms
```text
PASS: clsx/package.json resolves for downstream tooling


```

## Boundaries
Assumes a reproducible good-to-bad transition on a linear history. Skips can make a result ambiguous. A candidate boundary is not proof of the semantic root cause. Disposable checkout isolation is not a security sandbox. Git bisect performs the search. Local AI provides optional hypotheses.