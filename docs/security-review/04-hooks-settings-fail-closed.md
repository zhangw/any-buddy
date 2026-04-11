# [high] Hook installation can silently wipe the user's existing Claude settings on JSON parse failure

**Location:** `src/config/hooks.ts:26-78`
**Severity:** high
**Category:** Local data loss / silent config corruption

## Finding

`getClaudeSettings` converts any read/parse failure into `{}`. `installHook` and `removeHook` then persist that object back to `~/.claude/settings.json`, which means **one malformed or partially written settings file is enough to erase the user's other settings and hooks**. The write path also truncates and rewrites the live file directly, with no backup and no temp-file-plus-rename, so a partial write mid-flight can itself corrupt the file.

Because the normal `apply` flow auto-installs the hook when it appears absent, this destructive rewrite can happen during routine usage — not just an explicit settings-repair action.

## Impact

Hidden loss of unrelated automation or safety hooks, plus hard-to-debug configuration corruption. This is particularly dangerous because:
- The failure mode is silent — no error is surfaced to the user.
- It affects the global `~/.claude/settings.json`, not a project-local file.
- Other tools and Claude Code features that rely on hooks or settings will stop working without any clear signal.
- The auto-install on apply means a corrupted settings file triggers the wipe on normal flows, not just repair commands.
- No atomic write means an interrupted write can itself produce the corrupted-file state that then triggers the wipe on the next run — a self-reinforcing failure.

## Recommendation

- **Fail closed** on parse errors. Surface the error, refuse to modify the file, and never rewrite from an empty fallback.
- **Backup before write.** Create a timestamped backup before any settings rewrite, regardless of whether parsing succeeded.
- **Atomic write.** Use write-to-temp-plus-rename so a partial write does not corrupt the existing file.
- Add a regression test confirming: given a corrupted `settings.json`, `installHook`/`removeHook` refuse to overwrite.

## References

- Codex adversarial review (2026-04-11) — confirmed across three independent passes
