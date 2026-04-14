import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const PREFIX = 'any-buddy-sl-';

function togglePath(sessionId: string): string {
  return join(tmpdir(), `${PREFIX}${sessionId}.toggle`);
}

export function isStatusLineEnabled(sessionId: string): boolean {
  if (!sessionId) return false;
  try {
    return readFileSync(togglePath(sessionId), 'utf-8').trim() === 'on';
  } catch {
    return false;
  }
}

export function setStatusLineEnabled(sessionId: string, enabled: boolean): void {
  const p = togglePath(sessionId);
  if (enabled) {
    writeFileSync(p, 'on\n');
  } else {
    try {
      unlinkSync(p);
    } catch {
      // Already gone — fine
    }
  }
}

export function toggleStatusLine(sessionId: string): boolean {
  const next = !isStatusLineEnabled(sessionId);
  setStatusLineEnabled(sessionId, next);
  return next;
}
