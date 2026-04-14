import { writeFileSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getClaudeSettings, saveClaudeSettings } from '@/config/hooks.js';

const WRAPPER_PATH = join(homedir(), '.claude', 'any-buddy-statusline-wrapper.sh');
const OUR_COMMAND = 'any-buddy statusline';
const MARKER = '# any-buddy-statusline';

interface StatusLineEntry {
  type: string;
  command: string;
}

function getStatusLineCommand(): string | undefined {
  return (getClaudeSettings().statusLine as StatusLineEntry | undefined)?.command;
}

/** Read settings, apply a statusLine change, and write back — single read-write cycle. */
function updateStatusLine(entry: StatusLineEntry | undefined): void {
  const settings = getClaudeSettings();
  if (entry) {
    settings.statusLine = entry;
  } else {
    delete settings.statusLine;
  }
  saveClaudeSettings(settings);
}

export function isStatusLineInstalled(): boolean {
  const cmd = getStatusLineCommand() ?? '';
  return cmd.includes(OUR_COMMAND) || cmd.includes(WRAPPER_PATH);
}

export function installStatusLine(): { composed: boolean } {
  const existing = getStatusLineCommand();

  if (existing?.includes(OUR_COMMAND) || existing?.includes(WRAPPER_PATH)) {
    return { composed: false };
  }

  if (existing) {
    const wrapper = `#!/usr/bin/env bash
${MARKER}
# Wrapper: runs original status line + any-buddy pet sprite
input=$(cat)

original_output=$(echo "$input" | ${existing} 2>/dev/null)
buddy_output=$(echo "$input" | ${OUR_COMMAND} 2>/dev/null)

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

    updateStatusLine({ type: 'command', command: `bash ${WRAPPER_PATH}` });
    return { composed: true };
  }

  updateStatusLine({ type: 'command', command: OUR_COMMAND });
  return { composed: false };
}

export function uninstallStatusLine(): void {
  const cmd = getStatusLineCommand();
  if (!cmd) return;

  if (cmd === OUR_COMMAND) {
    updateStatusLine(undefined);
    return;
  }

  if (!cmd.includes(WRAPPER_PATH)) return;

  // Restore the original command embedded in our wrapper script
  try {
    const wrapper = readFileSync(WRAPPER_PATH, 'utf-8');
    const match = wrapper.match(/original_output=\$\(echo "\$input" \| (.+?) 2>/);
    updateStatusLine(match?.[1] ? { type: 'command', command: match[1] } : undefined);
  } catch {
    updateStatusLine(undefined);
  }
}
