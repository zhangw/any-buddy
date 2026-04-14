import { loadPetConfigV2 } from '@/config/pet-config.js';
import { renderAnimatedSprite, renderFace, IDLE_SEQUENCE } from '@/sprites/index.js';
import { RARITY_STARS, STAT_NAMES } from '@/constants.js';
import type { Bones, Eye, ProfileData } from '@/types.js';
import { isStatusLineEnabled, toggleStatusLine, setStatusLineEnabled } from './toggle.ts';
import { colorizeSprite, colorText } from './colors.ts';

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/** Map claude-buddy-rs eye names to any-buddy eye characters. */
const RUST_EYE_MAP: Record<string, Eye> = {
  dot: '·',
  star: '✦',
  cross: '×',
  filled: '◉',
  at: '@',
  circle: '°',
};

interface RustProfile {
  salt: string;
  species: string;
  rarity: string;
  eye: string;
  hat: string;
  shiny: boolean;
  stats: number[];
  name: string | null;
  personality: string | null;
  created_at: string;
}

interface RustConfig {
  version: number;
  active_profile: string | null;
  profiles: Record<string, RustProfile>;
}

/** Load profile from claude-buddy-rs config at ~/.claude-buddy/config.json */
function loadRustConfig(): { profile: ProfileData; activeProfile: string } | null {
  const configPath = join(homedir(), '.claude-buddy', 'config.json');
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as RustConfig;
    if (!raw.active_profile || !raw.profiles[raw.active_profile]) return null;
    const rp = raw.profiles[raw.active_profile];

    // Convert stats array [DEBUG, PATIENCE, CHAOS, WISDOM, SNARK] to object
    const stats: Partial<Record<string, number>> = {};
    for (let i = 0; i < STAT_NAMES.length && i < rp.stats.length; i++) {
      stats[STAT_NAMES[i]] = rp.stats[i];
    }

    return {
      activeProfile: raw.active_profile,
      profile: {
        salt: rp.salt,
        species: rp.species as ProfileData['species'],
        rarity: rp.rarity as ProfileData['rarity'],
        eye: (RUST_EYE_MAP[rp.eye] ?? '·') as Eye,
        hat: rp.hat as ProfileData['hat'],
        shiny: rp.shiny,
        stats,
        name: rp.name,
        personality: rp.personality,
        createdAt: rp.created_at,
      },
    };
  } catch {
    return null;
  }
}

/** Try any-buddy config first, fall back to claude-buddy-rs config. */
function loadActiveProfile(): ProfileData | null {
  const config = loadPetConfigV2();
  if (config?.activeProfile && config.profiles[config.activeProfile]) {
    return config.profiles[config.activeProfile];
  }
  return loadRustConfig()?.profile ?? null;
}

/**
 * Parse session_id from the JSON that Claude Code pipes to the status line command via stdin.
 * Returns empty string if not available.
 */
function readSessionId(): string {
  try {
    const input = readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    return (data.session_id as string) ?? '';
  } catch {
    return '';
  }
}

/**
 * Render the pet sprite to stdout for Claude Code's status line.
 * Called by: `any-buddy statusline`
 */
export function runStatusLineRender(): void {
  const sessionId = readSessionId();
  if (!sessionId || !isStatusLineEnabled(sessionId)) return;

  const profile = loadActiveProfile();
  if (!profile) return;

  const { species, rarity, eye, hat, shiny, stats } = profile;
  const bones: Bones = { species, rarity, eye, hat, shiny, stats };

  // Timestamp-based animation frame — Claude Code controls refresh rate,
  // so each call naturally shows the correct frame for this moment
  const now = Date.now();
  const frame = Math.floor(now / 500) % IDLE_SEQUENCE.length;

  const spriteText = renderAnimatedSprite(bones, frame, 5);
  const spriteLines = spriteText.split('\n');
  const colorized = colorizeSprite(spriteLines, bones.rarity, bones.shiny, now);

  const name = profile.name ?? bones.species;
  const face = renderFace(bones);
  const stars = RARITY_STARS[bones.rarity];
  const shinyTag = bones.shiny ? ' shiny' : '';
  // Format: face + name + stars + [shiny] + species (species only if name differs)
  const speciesTag = profile.name ? ` ${bones.species}` : '';
  const label = colorText(`${face} ${name} ${stars}${shinyTag}${speciesTag}`, bones.rarity);

  const output = [label, ...colorized];
  process.stdout.write(output.join('\n'));
}

/**
 * Toggle the status line display on/off.
 * Called by: `any-buddy statusline toggle [on|off] [--session <id>]`
 */
export function runStatusLineToggle(args: string[]): void {
  // Parse --session flag
  let sessionId = '';
  const filtered: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session' && i + 1 < args.length) {
      sessionId = args[++i];
    } else {
      filtered.push(args[i]);
    }
  }

  if (!sessionId) {
    console.error('Error: --session <id> is required for statusline toggle');
    process.exit(1);
  }

  const directive = filtered[0]?.toLowerCase();

  let enabled: boolean;
  if (directive === 'on') {
    setStatusLineEnabled(sessionId, true);
    enabled = true;
  } else if (directive === 'off') {
    setStatusLineEnabled(sessionId, false);
    enabled = false;
  } else {
    enabled = toggleStatusLine(sessionId);
  }

  const activeProfile = loadActiveProfile();

  if (enabled && activeProfile) {
    const name = activeProfile.name ?? activeProfile.species;
    console.log(`any-buddy: ${name} is now visible in the status line.`);
  } else if (enabled) {
    console.log('any-buddy: display ON — run `any-buddy` to pick a pet first.');
  } else {
    console.log('any-buddy: display OFF.');
  }
}
