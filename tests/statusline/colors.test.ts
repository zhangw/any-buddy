import { describe, it, expect } from 'vitest';
import { colorizeSprite, colorText } from '@/statusline/colors.ts';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

describe('colorizeSprite', () => {
  const lines = ['line1', 'line2', 'line3'];

  it('applies common rarity color (white)', () => {
    const result = colorizeSprite(lines, 'common', false, 0);
    for (const line of result) {
      expect(line).toContain(`${ESC}37m`);
      expect(line.endsWith(RESET)).toBe(true);
    }
  });

  it('applies legendary rarity color (bold yellow)', () => {
    const result = colorizeSprite(lines, 'legendary', false, 0);
    for (const line of result) {
      expect(line).toContain(`${ESC}1;33m`);
    }
  });

  it('applies shiny color cycle with different colors per line', () => {
    const result = colorizeSprite(lines, 'common', true, 0);
    // Each line gets a different ANSI color prefix, so full strings differ even for same content length
    expect(result[0]).not.toBe(result[1]);
    expect(result[1]).not.toBe(result[2]);
  });

  it('shiny color offset shifts with timestamp', () => {
    const t0 = colorizeSprite(['x'], 'common', true, 0);
    const t1 = colorizeSprite(['x'], 'common', true, 500);
    // Different timestamps (500ms apart) should produce different colors for the same line
    expect(t0[0]).not.toBe(t1[0]);
  });

  it('non-shiny color does not change with timestamp', () => {
    const t0 = colorizeSprite(['x'], 'epic', false, 0);
    const t1 = colorizeSprite(['x'], 'epic', false, 99999);
    expect(t0[0]).toBe(t1[0]);
  });
});

describe('colorText', () => {
  it('wraps text with rarity color and reset', () => {
    const result = colorText('hello', 'rare');
    expect(result).toBe(`${ESC}94mhello${RESET}`);
  });
});
