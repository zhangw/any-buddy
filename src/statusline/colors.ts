import type { Rarity } from '@/types.js';

// Raw ANSI codes — stdout goes to Claude Code's status line parser, not a real TTY,
// so we cannot rely on chalk's isatty detection.
const ESC = '\x1b[';
const RESET = `${ESC}0m`;

const RARITY_COLORS: Record<Rarity, string> = {
  common: `${ESC}37m`,
  uncommon: `${ESC}32m`,
  rare: `${ESC}94m`,
  epic: `${ESC}95m`,
  legendary: `${ESC}1;33m`,
};

const SHINY_CYCLE = [
  `${ESC}91m`, // bright red
  `${ESC}93m`, // bright yellow
  `${ESC}92m`, // bright green
  `${ESC}96m`, // bright cyan
  `${ESC}94m`, // bright blue
  `${ESC}95m`, // bright magenta
];

export function colorizeSprite(
  lines: string[],
  rarity: Rarity,
  shiny: boolean,
  timestampMs: number,
): string[] {
  if (shiny) {
    // Each line gets a different bright color; offset shifts with time for a wave effect
    const offset = Math.floor(timestampMs / 500) % SHINY_CYCLE.length;
    return lines.map((line, i) => {
      const color = SHINY_CYCLE[(i + offset) % SHINY_CYCLE.length];
      return `${color}${line}${RESET}`;
    });
  }

  const color = RARITY_COLORS[rarity];
  return lines.map((line) => `${color}${line}${RESET}`);
}

export function colorText(text: string, rarity: Rarity): string {
  return `${RARITY_COLORS[rarity]}${text}${RESET}`;
}
