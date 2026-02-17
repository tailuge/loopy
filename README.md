# loopy

AI-powered CLI assistant using Vercel AI SDK with tool calling capabilities.

## Features

- Query LLM models from OpenRouter (300+ models) or Google Gemini
- Tool calling support (list_dir tool included)
- Verbose and debug output modes
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

### Basic Query

```bash
./bin/loopy "1+1=?"
```

### CLI Options

```
loopy - AI-powered CLI assistant

Usage:
  loopy [options] <prompt>

Options:
  --help                Show this help message
  --verbose             Show detailed output (token usage, tool calls)
  --debug               Show raw JSON payloads (request body, response body, headers)
  --model <model_id>    Override model (e.g., openai/gpt-4o-mini, gemini-2.5-flash)
  --provider <name>     Provider: openrouter (default) or google
  --max-steps <n>       Maximum number of LLM steps (default: 5)
  --list-models         List available models from current provider
```

### Examples

```bash
# Basic query (uses OpenRouter with gpt-4o-mini)
./bin/loopy "What is the capital of France?"

# Use Google Gemini instead
./bin/loopy --provider google "Explain quantum computing"

# Verbose output with token usage
./bin/loopy --verbose "Explain quantum computing"

# Use a specific OpenRouter model
./bin/loopy --model anthropic/claude-3.5-sonnet "Hello"

# Use a specific Google model
./bin/loopy --provider google --model gemini-2.5-flash "Hello"

# List available models
./bin/loopy --list-models
./bin/loopy --provider google --list-models
```

## Tool Calling

The CLI includes a `list_dir` tool that allows the LLM to list directory contents:

```bash
./bin/loopy "List the files in /tmp"
```

With verbose output, you can see tool call details:

```bash
./bin/loopy --verbose "What files are in my home directory?"
```

## Verification

Run the verification script to test model response and tool calling:

```bash
# Use default provider/model (OpenRouter with gpt-4o-mini)
npm run verify

# Test with Google Gemini
npm run verify -- --provider google --model gemini-2.5-flash

# Test with a specific OpenRouter model
npm run verify -- --model anthropic/claude-3-haiku
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run the compiled CLI |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run verify` | Verify model response and tool calling |
| `npm run clean` | Remove compiled output |

## Project Structure

```
loopy/
├── bin/
│   └── loopy           # CLI executable entry point
├── config/
│   └── default.json    # Default configuration
├── scripts/
│   └── verify.js       # Verification script
├── src/
│   ├── index.ts        # Main CLI implementation
│   └── tools/
│       └── list-dir.ts # list_dir tool
├── dist/               # Compiled JavaScript (generated)
├── .env.local          # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Export a tool using the AI SDK `tool()` function
3. Register the tool in `src/index.ts`
4. Add to `config/default.json` tools.enabled array

## License

MIT
