# Copilot focused review

## Finding 1 — proposed patches can replace the regression check and produce a false passing fix

**Severity:** High  
**Affected code:** `lib/verify-fix.mjs:32-40`, especially the patch application before execution at lines 32-35 and command execution at line 40.

For a command-based investigation (`source.reproScript` is absent), `verifyFix` applies the proposed patch to the disposable checkout and then runs `source.command` there. It does not preserve, hash, or independently restore the check file. A patch can therefore replace `check.mjs` with `process.exit(0)` (or otherwise weaken the assertion), causing the “Proposed fix” variant to report `good` even though the original regression remains in the application code. The returned `passed` status then falsely establishes trust in the proposal.

The existing scope disclaimer at `lib/verify-fix.mjs:10` asks the reviewer to review test changes, but the machine-verifiable result still claims `passed`; this is precisely the proposed-fix trust boundary the workflow should enforce.

**Focused reproducer:** `test/copilot.test.mjs`

The test creates the bundled regression fixture, verifies its real boundary, then proposes a patch that replaces the committed `check.mjs` with `process.exit(0);`. It asserts that this must not be accepted.

**Command and observed result:**

```text
node --test test/copilot.test.mjs
```

The test failed, as expected for the current implementation:

```text
tests 1
pass 0
fail 1
AssertionError [ERR_ASSERTION]: a proposal that replaces the command-based check with process.exit(0) must not be accepted as a fix
actual: 'passed'
expected: 'passed'
```

The observed `actual: 'passed'` confirms the false-positive path.

**Suggested fix:** Before applying a patch, snapshot the exact command/check inputs used by the source investigation (at minimum the command-referenced files, or require a portable injected `reproScript` for patch verification). After applying the proposal, reject or mark the result inconclusive if the proposal changes the check, its assertions, or its execution inputs. A passing proposal should only be reported when the original regression check is executed unchanged against the patched application.
