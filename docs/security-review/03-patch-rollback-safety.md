# [high] Patch/restore delete the original binary before replacement is confirmed

**Location:** `src/patcher/patch.ts:65-143` (both `patchBinary` and `restoreBinary`)
**Severity:** high
**Category:** Local outage / rollback safety

## Finding

After writing the temp file, **both** `patchBinary` *and* `restoreBinary` retry any `renameSync` failure by deleting the destination first and then attempting another rename. If that second rename also fails, the outer catch removes the temp file, leaving the user with **no working Claude binary at all**. The same delete-first pattern is repeated in restore, so a transient rename problem turns into a full local outage on either code path.

## Impact

Local outage: the user loses their working `claude` binary and must manually recover from backup. Users who installed the SessionStart hook may hit this during normal usage rather than only on an explicit patch invocation. Because `restoreBinary` has the same bug, the "undo" path is itself unsafe — a failed restore can destroy the very binary you are trying to restore.

## Recommendation

- Do not unlink the original binary as a generic retry strategy — in either `patchBinary` or `restoreBinary`.
- Handle only specific transient errors (e.g. `EXDEV` cross-device moves) explicitly — do not blanket-retry by deleting.
- Keep the original in place until replacement is fully confirmed.
- On any failure in the replacement attempt, automatically restore from the backup copy rather than leaving the user with nothing.
- Add a regression test for rename-failure rollback behavior covering both `patchBinary` and `restoreBinary`.

## References

- Codex adversarial review (2026-04-11) — confirmed across three independent passes
