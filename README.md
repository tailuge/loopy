# loopy

AI-powered CLI assistant using Vercel AI SDK with tool calling capabilities. Includes both a traditional CLI and an interactive TUI.

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

#### CLI Options

```
loopy - AI-powered CLI assistant

Usage:
  loopy [options] <prompt>

Options:
  --help                Show this help message
  --version             Show version
  --verbose             Show detailed output (token usage, tool calls)
  --debug               Show raw JSON payloads (request body, response body, headers)
  --model <model_id>    Override model (e.g., openai/gpt-4o-mini, gemini-2.5-flash)
  --provider <name>     Provider: openrouter (default) or google
  --max-steps <n>       Maximum number of LLM steps (default: 5)
  --list-models         List available models from current provider
```

### TUI (`loopy-tui`)

```bash
./bin/loopy-tui
```

Interactive terminal interface with:

- Real-time streaming responses
- Command history (↑/↓ arrows)
- Slash commands for model/provider switching
- Toggleable log panel (backtick key)

#### TUI Commands

| Command | Aliases | Action |
|---------|---------|--------|
| `/exit` | `/quit`, `/q` | Exit TUI |
| `/help` | `/?` | Show available commands |
| `/list-models` | - | List models from current provider |
| `/model <name>` | - | Switch model |
| `/provider <name>` | - | Switch provider (google/openrouter) |
| `/clear` | - | Clear conversation history |
| `/log` | - | Toggle log panel |

### Examples

```bash
# CLI: Basic query (uses OpenRouter with gpt-4o-mini)
./bin/loopy "What is the capital of France?"

# CLI: Use Google Gemini
./bin/loopy --provider google "Explain quantum computing"

# CLI: Verbose output with token usage
./bin/loopy --verbose "Explain quantum computing"

# CLI: Use a specific OpenRouter model
./bin/loopy --model anthropic/claude-3.5-sonnet "Hello"

# TUI: Start interactive session
./bin/loopy-tui
```

## Tool Calling

The CLI includes a `list_dir` tool that allows the LLM to list directory contents:

```bash
./bin/loopy "List the files in /tmp"
```

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

## Project Structure

```
loopy/
├── bin/
│   ├── loopy           # CLI executable
│   └── loopy-tui       # TUI executable
├── config/
│   └── default.json    # Default configuration
├── scripts/
│   └── verify.js       # Verification script
├── src/
│   ├── index.ts        # CLI entry point
│   ├── tui.tsx         # TUI entry point
│   ├── version.ts      # Git-based versioning
│   ├── config.ts       # Configuration loader
│   ├── llm/
│   │   ├── client.ts   # Streaming LLM client
│   │   ├── types.ts    # Type definitions
│   │   └── logger.ts   # File logging
│   ├── commands/
│   │   ├── index.ts    # Command handlers
│   │   └── list-models.ts
│   ├── tools/
│   │   └── list-dir.ts # list_dir tool
│   └── components/
│       ├── App.tsx
│       ├── Banner.tsx
│       ├── InputArea.tsx
│       ├── LogPanel.tsx
│       ├── MessageItem.tsx
│       ├── MessageList.tsx
│       └── ToolCallDisplay.tsx
├── dist/               # Compiled JavaScript (generated)
├── .env.local          # Environment variables (gitignored)
└── package.json
```

## Logging

Logs are written to `~/.loopy/logs/YYYY-MM-DD.log` with timestamps and log levels (debug, info, warn, error).

View logs:
```bash
cat ~/.loopy/logs/$(date +%Y-%m-%d).log
```

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
