# Security Review — any-buddy buddy injection path

Source: Codex adversarial review (2026-04-11) — confirmed across three independent passes.
Target: working tree / current buddy injection implementation
Verdict: **needs-attention** — no-ship.

> No-ship. The buddy patching path contains a real local command-execution bug on macOS and multiple destructive file-handling paths that can corrupt binaries or wipe user settings. Same four findings reproduced by three independent review passes.

## Findings

| # | Severity | Area | File | Title |
|---|----------|------|------|-------|
| 1 | critical | patcher | `src/patcher/patch.ts:20-26` | [macOS codesign shell injection via target path](./01-codesign-shell-injection.md) |
| 2 | high | patcher | `src/patcher/binary-finder.ts:101-105` | [`CLAUDE_BINARY` accepts arbitrary paths](./02-claude-binary-env-validation.md) |
| 3 | high | patcher | `src/patcher/patch.ts:65-143` | [Patch/restore delete original before replacement is confirmed](./03-patch-rollback-safety.md) |
| 4 | high | config | `src/config/hooks.ts:26-78` | [Hook install can wipe user settings on JSON parse failure](./04-hooks-settings-fail-closed.md) |

## Threat model summary (why this matters for a local buddy user)

You asked: *"what are the latent risks if I want a new buddy on my local?"* The short version:

- **Local command execution (macOS)**: if your shell environment sets a crafted `CLAUDE_BINARY`, applying a buddy runs attacker-controlled commands as you. Finding #1.
- **Arbitrary file corruption**: a bad `CLAUDE_BINARY` value turns patch/restore into a tool that overwrites and re-signs any user-writable file. Finding #2.
- **Losing your Claude binary**: a transient rename failure during apply or restore can leave you with no working `claude` at all. Finding #3.
- **Silent loss of global Claude settings**: any malformed `~/.claude/settings.json` gets rewritten as `{}` by hook install/remove, erasing unrelated hooks and settings. Finding #4.

The common thread: the injection approach trusts its environment (env vars, existing files, JSON parse) without validating. For a fork you do not fully trust, the practical mitigation before applying a buddy is to (a) back up your Claude binary and `~/.claude/settings.json`, (b) never set `CLAUDE_BINARY`, and (c) audit the four call sites above.

## Next steps (from Codex)

- Fix the four blocking security issues before shipping the buddy patch flow.
- Remove shell interpolation from all external command execution that includes discovered paths.
- Require positive identity checks before patching any `CLAUDE_BINARY` target.
- Make patch/restore replacement atomic and rollback-safe under rename failure.
- Change Claude settings handling to fail closed with backup and atomic write semantics.
- Add regression tests for malformed `settings.json`, env-supplied binary validation, and rename-failure rollback behavior.
