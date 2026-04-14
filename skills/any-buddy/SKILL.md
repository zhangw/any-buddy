---
name: any-buddy
description: Toggle any-buddy companion pet visibility in the Claude Code status line (on/off/toggle). Use when the user wants to show, hide, or toggle their buddy pet.
argument-hint: '[on|off] (omit to toggle)'
allowed-tools: Bash(any-buddy *)
---

Toggle the any-buddy pet display in the Claude Code status line.

Run this command to toggle or explicitly set the buddy pet display:

```bash
any-buddy statusline toggle $ARGUMENTS --session ${CLAUDE_SESSION_ID}
```

Report the result to the user. If the buddy is now visible, mention they should see their pet appear in the status line at the bottom of the terminal. If hidden, confirm the pet has been hidden.

If the command fails because any-buddy is not installed, tell the user to install it with `npm install -g any-buddy`.

If the user has no active buddy profile, suggest they run `any-buddy` in a terminal to create one first.
