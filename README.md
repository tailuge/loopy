# loopy

AI-powered CLI assistant using Vercel AI SDK with tool calling capabilities.

## Features

- Query LLM models from Google Gemini
- Tool calling support (list_dir tool included)
- Verbose and debug output modes
- Configurable model and max steps
- Model listing from provider

## Prerequisites

- Node.js 18+
- Google Generative AI API key

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env.local` file in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

Default configuration is in `config/default.json`:

```json
{
  "model": {
    "name": "gemini-flash-lite-latest"
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
  --model <model_id>    Override model (e.g., gemini-2.5-flash)
  --max-steps <n>       Maximum number of LLM steps (default: 5)
  --list-models         List available models from current provider
```

### Examples

```bash
# Basic query
./bin/loopy "What is the capital of France?"

# Verbose output with token usage
./bin/loopy --verbose "Explain quantum computing"

# Debug mode with raw payloads
./bin/loopy --debug "1+1=?"

# Use a specific model
./bin/loopy --model gemini-2.5-flash "Hello"

# Limit steps for simple queries
./bin/loopy --max-steps 1 "What is 2+2?"

# List available models
./bin/loopy --list-models
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
# Use default model
npm run verify

# Test with a specific model
npm run verify -- --model gemini-2.5-flash
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
