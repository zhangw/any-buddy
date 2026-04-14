#!/usr/bin/env node

import {
  runStartScreen,
  runPreview,
  runCurrent,
  runApply,
  runRestore,
  runRehatch,
  runBuddies,
  runShare,
} from './tui/index.ts';
import { ISSUE_URL, diagnostics } from './constants.ts';
import type { CliFlags } from './types.ts';

// Re-exec under Bun when running on Node so users get the OpenTUI builder.
// Skip for `apply --silent` (runs from hooks, speed matters) and `help`.
if (typeof globalThis.Bun === 'undefined' && process.env.__ANYBUDDY_NO_REEXEC !== '1') {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h') || args[0] === 'help';
  const isSilentApply = args[0] === 'apply' && args.includes('--silent');
  const isStatusLine = args[0] === 'statusline' && !args.includes('toggle');
  const isPlugin = args[0] === 'plugin';
  if (!isHelp && !isSilentApply && !isStatusLine && !isPlugin) {
    try {
      const { spawnSync } = await import('child_process');
      const { findBunBinary } = await import('./patcher/binary-finder.ts');
      const bunPath = findBunBinary();
      // Verify bun is callable
      const ver = spawnSync(bunPath, ['--version'], { stdio: 'pipe', timeout: 5000 });
      if (ver.status === 0) {
        const { status } = spawnSync(bunPath, [process.argv[1], ...args], {
          stdio: 'inherit',
          env: { ...process.env, __ANYBUDDY_NO_REEXEC: '1' },
        });
        process.exit(status ?? 0);
      }
    } catch {
      // Bun not available — continue under Node with fallback TUI
    }
  }
}

function parseArgs(argv: string[]): { command: string | undefined; flags: CliFlags } {
  const args = argv.slice(2);
  const flags: CliFlags = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = i + 1 < args.length ? args[i + 1] : undefined;
    if ((arg === '--species' || arg === '-s') && next !== undefined) {
      flags.species = args[++i];
    } else if ((arg === '--rarity' || arg === '-r') && next !== undefined) {
      flags.rarity = args[++i];
    } else if ((arg === '--eye' || arg === '-e') && next !== undefined) {
      flags.eye = args[++i];
    } else if ((arg === '--hat' || arg === '-t') && next !== undefined) {
      flags.hat = args[++i];
    } else if ((arg === '--name' || arg === '-n') && next !== undefined) {
      flags.name = args[++i];
    } else if ((arg === '--personality' || arg === '-p') && next !== undefined) {
      flags.personality = args[++i];
    } else if (arg === '--preset' && next !== undefined) {
      flags.preset = args[++i];
    } else if (arg === '--shiny') {
      flags.shiny = true;
    } else if (arg === '--peak' && next !== undefined) {
      flags.peak = args[++i];
    } else if (arg === '--dump' && next !== undefined) {
      flags.dump = args[++i];
    } else if (arg === '--all') {
      flags.all = true;
    } else if (arg === '--silent') {
      flags.silent = true;
    } else if (arg === '--no-hook') {
      flags.noHook = true;
    } else if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
    } else if (arg === '--help' || arg === '-h') {
      positional.unshift('help');
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { command: positional[0], flags };
}

const { command, flags } = parseArgs(process.argv);

try {
  switch (command) {
    case 'apply':
      await runApply({ silent: flags.silent, noHook: flags.noHook });
      break;
    case 'preview':
      await runPreview(flags);
      break;
    case 'current':
      await runCurrent();
      break;
    case 'restore':
      await runRestore();
      break;
    case 'rehatch':
      await runRehatch();
      break;
    case 'buddies':
      await runBuddies();
      break;
    case 'share':
      await runShare();
      break;
    case 'plugin': {
      const sub = process.argv[3];
      const { installStatusLine, uninstallStatusLine, isStatusLineInstalled } =
        await import('./statusline/install.ts');
      if (sub === 'install') {
        if (isStatusLineInstalled()) {
          console.log('any-buddy plugin already installed.');
        } else {
          const result = installStatusLine();
          console.log('any-buddy plugin installed.');
          if (result.composed) {
            console.log('  Composed with your existing status line command.');
          }
          console.log('  Restart Claude Code, then type /any-buddy to toggle your pet.');
        }
      } else if (sub === 'uninstall') {
        if (!isStatusLineInstalled()) {
          console.log('any-buddy plugin is not installed.');
        } else {
          uninstallStatusLine();
          console.log('any-buddy plugin uninstalled. Original status line restored.');
        }
      } else if (sub === 'status') {
        console.log(`any-buddy plugin: ${isStatusLineInstalled() ? 'installed' : 'not installed'}`);
      } else {
        console.log('Usage:');
        console.log('  any-buddy plugin install     Set up status line in Claude Code');
        console.log('  any-buddy plugin uninstall   Remove status line, restore original');
        console.log('  any-buddy plugin status      Check if plugin is installed');
      }
      break;
    }
    case 'statusline': {
      const sub = process.argv[3];
      if (sub === 'toggle') {
        const { runStatusLineToggle } = await import('./statusline/index.ts');
        runStatusLineToggle(process.argv.slice(4));
      } else {
        const { runStatusLineRender } = await import('./statusline/index.ts');
        runStatusLineRender();
      }
      break;
    }
    case 'help':
      printHelp();
      break;
    default:
      await runStartScreen(flags);
      break;
  }
  process.exit(0);
} catch (err) {
  const error = err as Error & { name: string };
  if (error.name === 'ExitPromptError') {
    process.exit(0);
  }
  console.error(`\n  Error: ${error.message}`);
  if (!error.message.includes('github.com/cpaczek/any-buddy')) {
    console.error(`\n  If this seems like a bug, please report it at:\n  ${ISSUE_URL}`);
    console.error('\n  Please include the full error output above and:');
    console.error(diagnostics({ Args: process.argv.slice(2).join(' ') || '(none)' }));
  }
  process.exit(1);
}

function printHelp(): void {
  console.log(`
any-buddy — Pick any Claude Code companion pet

Usage:
  any-buddy                          Interactive pet picker
  any-buddy --species dragon         Skip species prompt
  any-buddy -s cat -r legendary -e ✦ -t wizard -y
                                     Fully non-interactive
  any-buddy --preset "Arcane Dragon"  Use a curated preset build
  any-buddy preview                  Browse pets without applying
  any-buddy preview --all            Show all preset builds at once
  any-buddy current                  Show your current pet
  any-buddy share                    Print an ASCII card of your pet + copy to clipboard
  any-buddy apply [--silent]         Re-apply saved pet after update
  any-buddy restore                  Restore original pet
  any-buddy buddies                  Browse and switch between your buddies
  any-buddy rehatch                  Delete companion to re-hatch via /buddy
  any-buddy plugin install            Set up any-buddy status line in Claude Code
  any-buddy plugin uninstall          Remove any-buddy status line, restore original
  any-buddy plugin status             Check if plugin is installed

Options:
  --all                  (preview only) Dump all preset builds with sprites to stdout
  --preset <name>        Use a curated preset (e.g., "Arcane Dragon", "Royal Capybara")
  -s, --species <name>   Species (duck, goose, blob, cat, dragon, octopus, owl,
                         penguin, turtle, snail, ghost, axolotl, capybara,
                         cactus, robot, rabbit, mushroom, chonk)
  -r, --rarity <level>   Rarity (common, uncommon, rare, epic, legendary)
  -e, --eye <char>       Eye style (· ✦ × ◉ @ °)
  -t, --hat <name>       Hat (none, crown, tophat, propeller, halo, wizard,
                         beanie, tinyduck)
  -n, --name <name>      Rename your companion
  -p, --personality <desc>  Set companion personality
  --shiny                Require shiny (~100x longer search)
  --peak <stat>          Best stat (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK)
  --dump <stat>          Worst stat (~20x longer search with both)
  -y, --yes              Skip confirmation prompts
  --no-hook              Don't offer to install the SessionStart hook
  --silent               Suppress output (for apply command in hooks)

Environment:
  CLAUDE_BINARY          Path to Claude Code binary (auto-detected by default)
`);
}
