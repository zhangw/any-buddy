# [critical] macOS codesign step is vulnerable to shell injection through the target path

**Location:** `src/patcher/patch.ts:20-26`
**Severity:** critical
**Category:** Local code execution

## Finding

`codesignBinary` builds a shell command string with `binaryPath` interpolated into it and executes that string with `execSync`. That path is not hardcoded; it is sourced from discovery logic and can be user-controlled via `CLAUDE_BINARY`, so a crafted filename containing shell substitutions like `$(...)` would be executed by the shell during patching.

## Impact

Arbitrary command execution as the local user while applying a buddy. A malicious environment — a poisoned `CLAUDE_BINARY` value, a wrapper script, or a filename placed in a writable dir — can run arbitrary commands simply by triggering a patch/apply flow.

## Recommendation

- Replace the shell command with argument-based process execution, e.g. `execFileSync('codesign', ['--force', '--sign', '-', binaryPath])`, so the shell never parses the path.
- Validate that the path points to an expected Claude binary (install layout, basename, signature markers) before invoking `codesign`.

## References

- Codex adversarial review (2026-04-11)
