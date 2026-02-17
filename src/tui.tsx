#!/usr/bin/env node
import { spawn } from 'child_process';
import React from 'react';
import { withFullScreen } from 'fullscreen-ink';
import { App } from './components/App.js';
import { loadEnv, loadConfig } from './config.js';
import { getVersionSync } from './version.js';

async function main() {
  // Check for --web flag first, before any other processing
  if (process.argv.includes('--web')) {
    const port = 8080;
    console.log(`Starting web interface on http://localhost:${port}`);

    // Spawn ttyd, telling it to run THIS same script but WITHOUT the --web flag
    const remainingArgs = process.argv.slice(2).filter(a => a !== '--web').join(' ');
    const nodePath = process.execPath;
    const cmd = `UI_MODE=mobile ${nodePath} ${process.argv[1]} ${remainingArgs}`.trim();
    const ttydCmd = `ttyd -p ${port} -i 0.0.0.0 --writable --once sh -c "${cmd}"`;

    const ttyd = spawn('sh', ['-c', ttydCmd], { stdio: 'inherit' });

    ttyd.on('exit', (code) => process.exit(code ?? 1));
    return;
  }

  await loadEnv();
  const config = await loadConfig();

  // Parse command line args
  const args = process.argv.slice(2);
  let provider: string | undefined;
  let model: string | undefined;
  let showVersion = false;
  let showHelp = false;
  let showWeb = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp = true;
    } else if (arg === '--web' || arg === '-w') {
      showWeb = true;
    } else if (arg === '--provider' || arg === '-p') {
      provider = args[++i];
    } else if (arg === '--model' || arg === '-m') {
      model = args[++i];
    }
  }

  if (showVersion) {
    console.log(getVersionSync());
    process.exit(0);
  }

  if (showHelp) {
    console.log(`
loopy-tui - Interactive AI CLI Assistant

Usage:
  loopy-tui [options]

Options:
  --help, -h            Show this help message
  --version, -v         Show version
  --web, -w             Start web interface via ttyd
  --provider, -p <name> Provider to use (google or openrouter)
  --model, -m <name>    Model to use

Commands (in TUI):
  /exit, /quit, /q      Exit the TUI
  /help, /?             Show available commands
  /list-models          List available models
  /model <name>         Switch model
  /provider <name>      Switch provider
  /clear                Clear conversation
  /log                  Toggle log panel

Keyboard:
  ↑/↓                   Navigate command history
  \` (backtick)          Toggle log panel
`);
    process.exit(0);
  }

  // Render the TUI with fullscreen support (alternate screen buffer)
  withFullScreen(<App initialProvider={provider} initialModel={model} />, {
    exitOnCtrlC: false,
  }).start();
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
