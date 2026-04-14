import { writeFileSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getClaudeSettings, saveClaudeSettings } from '@/config/hooks.js';

const WRAPPER_PATH = join(homedir(), '.claude', 'any-buddy-statusline-wrapper.sh');
const OUR_COMMAND = 'npx --yes any-buddy statusline';
const MARKER = '# any-buddy-statusline';

interface StatusLineEntry {
  type: string;
  command: string;
}

function getStatusLineCommand(): string | undefined {
  return (getClaudeSettings().statusLine as StatusLineEntry | undefined)?.command;
}

export function isStatusLineInstalled(): boolean {
  const cmd = getStatusLineCommand() ?? '';
  return cmd.includes(OUR_COMMAND) || cmd.includes(WRAPPER_PATH);
}

export function installStatusLine(): { composed: boolean } {
  const settings = getClaudeSettings();
  const existing = (settings.statusLine as StatusLineEntry | undefined)?.command;

  if (existing?.includes(OUR_COMMAND) || existing?.includes(WRAPPER_PATH)) {
    return { composed: false };
  }

  if (existing) {
    const wrapper = `#!/usr/bin/env bash
${MARKER}
# Wrapper: runs original status line + any-buddy pet sprite (parallel)
input=$(cat)

# Run both commands in parallel to stay within Claude Code's status line timeout
_sl_tmp=$(mktemp -d)
trap 'rm -rf "$_sl_tmp"' EXIT

echo "$input" | ${existing} > "$_sl_tmp/orig" 2>/dev/null &
echo "$input" | ${OUR_COMMAND} > "$_sl_tmp/buddy" 2>/dev/null &
wait

original_output=$(<"$_sl_tmp/orig")
buddy_output=$(<"$_sl_tmp/buddy")

if [ -n "$original_output" ] && [ -n "$buddy_output" ]; then
  printf '%s\\n%s' "$original_output" "$buddy_output"
elif [ -n "$original_output" ]; then
  printf '%s' "$original_output"
elif [ -n "$buddy_output" ]; then
  printf '%s' "$buddy_output"
fi
`;
    writeFileSync(WRAPPER_PATH, wrapper);
    chmodSync(WRAPPER_PATH, 0o755);

    settings.statusLine = { type: 'command', command: `bash ${WRAPPER_PATH}` };
    saveClaudeSettings(settings);
    return { composed: true };
  }

  settings.statusLine = { type: 'command', command: OUR_COMMAND };
  saveClaudeSettings(settings);
  return { composed: false };
}

export function uninstallStatusLine(): void {
  const settings = getClaudeSettings();
  const cmd = (settings.statusLine as StatusLineEntry | undefined)?.command;
  if (!cmd) return;

  if (cmd === OUR_COMMAND) {
    delete settings.statusLine;
  } else if (cmd.includes(WRAPPER_PATH)) {
    // Restore the original command embedded in our wrapper script
    try {
      const wrapper = readFileSync(WRAPPER_PATH, 'utf-8');
      // Match both sequential and parallel wrapper formats
      const match =
        wrapper.match(/echo "\$input" \| (.+?) > "\$_sl_tmp\/orig"/) ??
        wrapper.match(/original_output=\$\(echo "\$input" \| (.+?) 2>/);
      if (match?.[1]) {
        settings.statusLine = { type: 'command', command: match[1] };
      } else {
        delete settings.statusLine;
      }
    } catch {
      delete settings.statusLine;
    }
  } else {
    return; // Not our status line — don't touch
  }

  saveClaudeSettings(settings);
}
