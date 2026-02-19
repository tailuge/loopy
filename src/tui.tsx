#!/usr/bin/env node
import React from 'react';
import { withFullScreen } from 'fullscreen-ink';
import { App } from './components/App.js';
import { loadEnv } from './config.js';
import { getVersionSync } from './version.js';
import { startWebInterface } from './web.js';

async function main() {
  // Check for --web flag first, before any other processing
  if (process.argv.includes('--web')) {
    const exitCode = await startWebInterface({
      useMdns: process.argv.includes('--mdns')
    });
    process.exit(exitCode);
  }

  await loadEnv();

  // Parse command line args
  const args = process.argv.slice(2);
  let provider: string | undefined;
  let model: string | undefined;
  let showVersion = false;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp = true;
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
  --mdns                Publish loopy.local via mDNS (use with --web)
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
