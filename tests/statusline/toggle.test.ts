import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  isStatusLineEnabled,
  setStatusLineEnabled,
  toggleStatusLine,
} from '@/statusline/toggle.ts';

const tmp = tmpdir();

afterEach(() => {
  // Clean up toggle files created during tests
  try {
    for (const f of readdirSync(tmp)) {
      if (f.startsWith('any-buddy-sl-')) rmSync(join(tmp, f), { force: true });
    }
  } catch {
    /* ignore */
  }
});

// Use the temp dir prefix in session IDs so toggle files land in predictable paths.
// The toggle module writes to $TMPDIR/any-buddy-sl-<sessionId>.toggle,
// and we use the real tmpdir(), so we just need unique session IDs.
const SESSION = 'test-session-abc';

describe('statusline toggle', () => {
  it('isStatusLineEnabled returns false when no toggle file exists', () => {
    expect(isStatusLineEnabled(SESSION)).toBe(false);
  });

  it('isStatusLineEnabled returns false for empty session ID', () => {
    expect(isStatusLineEnabled('')).toBe(false);
  });

  it('setStatusLineEnabled(true) enables the status line', () => {
    setStatusLineEnabled(SESSION, true);
    expect(isStatusLineEnabled(SESSION)).toBe(true);
  });

  it('setStatusLineEnabled(false) disables the status line', () => {
    setStatusLineEnabled(SESSION, true);
    setStatusLineEnabled(SESSION, false);
    expect(isStatusLineEnabled(SESSION)).toBe(false);
  });

  it('toggleStatusLine flips from off to on', () => {
    const result = toggleStatusLine(SESSION);
    expect(result).toBe(true);
    expect(isStatusLineEnabled(SESSION)).toBe(true);
  });

  it('toggleStatusLine flips from on to off', () => {
    setStatusLineEnabled(SESSION, true);
    const result = toggleStatusLine(SESSION);
    expect(result).toBe(false);
    expect(isStatusLineEnabled(SESSION)).toBe(false);
  });

  it('different sessions have independent toggle state', () => {
    setStatusLineEnabled('session-a', true);
    setStatusLineEnabled('session-b', false);
    expect(isStatusLineEnabled('session-a')).toBe(true);
    expect(isStatusLineEnabled('session-b')).toBe(false);
  });
});
