# [high] `CLAUDE_BINARY` lets the tool patch any file on disk without proving it is Claude Code

**Location:** `src/patcher/binary-finder.ts:101-105`
**Severity:** high
**Category:** Local data loss / binary corruption

## Finding

`findClaudeBinary` accepts any existing path from `CLAUDE_BINARY` and returns it directly. Downstream callers then patch, restore, and — via `src/patcher/preflight.ts` — may even **auto-restore** that path as if it were the Claude binary. The rest of the apply flow reads it, creates `.anybuddy-bak`/`.anybuddy-tmp` siblings next to it, overwrites it, and on macOS re-signs it.

## Impact

A bad env var, wrapper script, or poisoned launch environment can corrupt arbitrary user-writable files or binaries. If the SessionStart hook is installed, the damage can **recur on every Claude launch**, turning a single bad value into a repeating destructive action. Because preflight's auto-restore path also trusts the same value, a single malicious env var can trigger mutations even without an explicit `apply`.

## Recommendation

- Refuse arbitrary paths. Validate the target against expected Claude install layout (basename, parent directory, package metadata) before allowing patch/apply/restore/preflight to touch it.
- Consider size/signature markers or a known-string sentinel inside the binary as a second check.
- Log and refuse, rather than silently trust, any `CLAUDE_BINARY` value that fails validation.
- Gate restore/patch operations on positive identity validation, not mere path existence.

## References

- Codex adversarial review (2026-04-11) — confirmed across three independent passes
