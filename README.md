# loopy

AI-powered CLI assistant using Vercel AI SDK with tool calling capabilities. Includes both a traditional CLI and an interactive TUI.

## Interface

```
 _                            
| |    ___   ___  _ __  _   _ 
| |   / _ \ / _ \| '_ \| | | |
| |__| (_) | (_) | |_) | |_| |
|_____\___/ \___/| .__/ \__, |
                 |_|    |___/ 
 Version: d93541c
 Provider: openrouter | Model: openrouter/auto
 Type /help for commands

System: 
        Available commands:
          /exit, /quit, /q    Exit the TUI
          /help, /?           Show this help message
          /list-models        List available models from current provider
          /model <name>       Switch to a different model
          /provider <name>    Switch provider (google or openrouter)
          /clear              Clear conversation history
          /log                Toggle log panel

        Tips:
          - Use ↑/↓ arrows to navigate command history
          - Select text with mouse to copy (terminal handles this)
          - Press ` (backtick) to toggle log panel




┌───────────────────────────────────────────────────────────────────────┐
│ > Type a message or /help for commands                                │
└───────────────────────────────────────────────────────────────────────┘

```

## Features

- **Two interfaces**: Traditional CLI (`loopy`) and interactive TUI (`loopy-tui`)
- Query LLM models from OpenRouter (300+ models) or Google Gemini
- Tool calling support (list_dir tool included)
- Streaming responses with real-time display (TUI)
- Conversation history with arrow key navigation (TUI)
- File logging to `~/.loopy/logs/`
- Configurable provider, model and max steps
- Model listing from current provider

## Prerequisites

- Node.js 18+
- OpenRouter API key (default) or Google Generative AI API key

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env.local` file in the project root:

```
OPENROUTER_API_KEY=your_openrouter_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

Only one provider key is required. OpenRouter is the default.

Default configuration is in `config/default.json`:

```json
{
  "provider": "openrouter",
  "model": {
    "name": "openai/gpt-4o-mini"
  },
  "tools": {
    "enabled": ["list_dir"]
  },
  "maxSteps": 5
}
```

## Usage

### CLI (`loopy`)

```bash
./bin/loopy "1+1=?"
```

### TUI (`loopy-tui`)

```bash
./bin/loopy-tui
```

### Web Interface

Run the TUI in a web browser via ttyd:

```bash
./bin/loopy-tui --web
```

This starts a web interface at `http://localhost:8080`. TTYd output is logged to `~/.loopy/logs/`.

#### mDNS/Bonjour Support

Use the `--mdns` flag to publish the service on your local network:

```bash
./bin/loopy-tui --web --mdns
```

This publishes `loopy.local` via mDNS/Bonjour, making the interface accessible at `http://loopy.local:8080` from any device on your local network. Useful for:
- Accessing from mobile devices on the same WiFi network
- No need to remember IP addresses
- Works with iOS/Android browsers that support .local domains

Note: mDNS requires Bonjour (macOS), Avahi (Linux), or Bonjour Print Services (Windows) to be installed on the client device.


## Verification

Run the verification script to test model response and tool calling:

```bash
npm run verify
npm run verify -- --provider google --model gemini-2.5-flash
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run the compiled CLI |
| `npm run start:tui` | Run the compiled TUI |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run verify` | Verify model response and tool calling |
| `npm run clean` | Remove compiled output |


## Logging

Logs are written to `~/.loopy/logs/YYYY-MM-DD.log` with timestamps and log levels (debug, info, warn, error).


## Development

### Adding New Tools

1. Create `src/tools/<tool-name>.ts`
2. Export a tool using the AI SDK `tool()` function
3. Import and add to tools object in `src/llm/client.ts`
4. Add to `config/default.json` tools.enabled array

### Adding New CLI Flags

1. Add parsing logic in `src/index.ts`
2. Update `printHelp()` with flag documentation
3. Apply flag value where needed

### Adding New TUI Commands

1. Add handler to `commands` object in `src/commands/index.ts`
2. Update `HELP_TEXT` constant

## License

MIT
