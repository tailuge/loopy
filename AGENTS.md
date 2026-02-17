# AGENTS.md

Guidance for AI agents working on the loopy codebase.

## Project Overview

loopy is a CLI assistant with two interfaces:
- **CLI** (`loopy`): Single-shot query tool
- **TUI** (`loopy-tui`): Interactive terminal UI using Ink (React for CLIs)

Both use the Vercel AI SDK to interact with LLM models with tool calling support.

## Key Technologies

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript
- **AI SDK**: Vercel AI SDK v6 (`ai` package)
- **Providers**: OpenRouter (`@openrouter/ai-sdk-provider`), Google (`@ai-sdk/google`)
- **TUI Framework**: Ink v5 (React-based)
- **Schema Validation**: Zod

## Architecture

### Entry Points

| Executable | File | Description |
|------------|------|-------------|
| `loopy` | `bin/loopy` → `src/index.ts` | CLI with flag parsing |
| `loopy-tui` | `bin/loopy-tui` → `src/tui.tsx` | Interactive TUI |

### Module Structure

```
src/
├── index.ts           # CLI entry
├── tui.tsx            # TUI entry
├── version.ts         # Git-based versioning
├── config.ts          # Config loader
├── llm/
│   ├── client.ts      # Streaming LLM client (streamChat, chat, createModel)
│   ├── types.ts       # Message, StreamEvent, LLMConfig types
│   └── logger.ts      # File logging to ~/.loopy/logs/
├── commands/
│   ├── index.ts       # Command handlers for TUI
│   └── list-models.ts # Model listing functions
├── tools/
│   └── list-dir.ts    # list_dir tool
└── components/        # Ink components for TUI
    ├── App.tsx        # Main layout
    ├── Banner.tsx     # Startup banner
    ├── InputArea.tsx  # Input with history navigation
    ├── MessageList.tsx
    ├── MessageItem.tsx
    ├── ToolCallDisplay.tsx
    └── LogPanel.tsx   # Toggleable log overlay
```

### Configuration Flow

1. Load `.env.local` for API credentials
2. Load `config/default.json` for model/tools/maxSteps settings
3. CLI flags override config values

## LLM Module

### Types (`src/llm/types.ts`)

```typescript
type Message = { role: 'user' | 'assistant' | 'system'; content: string };

type StreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; toolName: string; input: unknown }
  | { type: 'tool-result'; toolName: string; result: unknown }
  | { type: 'step-finish'; stepNumber: number }
  | { type: 'finish'; finishReason: string; usage?: {...} };

interface LLMConfig {
  provider: string;
  model: string;
  maxSteps: number;
  tools: ToolsRecord;
}
```

### Client (`src/llm/client.ts`)

```typescript
// Streaming chat - yields StreamEvents
async function* streamChat(messages: Message[], config: LLMConfig): AsyncGenerator<StreamEvent>

// Single-turn completion
async function chat(messages: Message[], config: LLMConfig): Promise<string>

// Model factory
function createModel(provider: string, modelName: string)
```

### Streaming Pattern

```typescript
for await (const event of streamChat(messages, config)) {
  if (event.type === 'text-delta') {
    // Append event.delta to displayed text
  } else if (event.type === 'tool-call') {
    // Show tool invocation
  } else if (event.type === 'finish') {
    // Complete - event.usage has token counts
  }
}
```

## TUI Commands

Commands are defined in `src/commands/index.ts`:

```typescript
export const commands: Record<string, CommandHandler> = {
  '/exit': () => ({ type: 'exit' }),
  '/model': (args, context) => { /* ... */ },
  // ...
};

export async function handleCommand(input: string, context: CommandContext): Promise<CommandResult>
```

CommandResult types:
- `{ type: 'continue' }` - No action needed
- `{ type: 'exit' }` - Exit the TUI
- `{ type: 'message'; content: string }` - Send as user message to LLM
- `{ type: 'output'; content: string }` - Display output to user

## Tool System

Tools use the AI SDK's `tool()` function:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    return result;
  },
});
```

Register in `src/llm/client.ts` and add to `config/default.json` tools.enabled.

## Version System

`src/version.ts` provides git-based versioning:

```typescript
import { getVersion, getVersionSync } from './version.js';

const version = await getVersion();  // Async
const version = getVersionSync();    // Sync (for Ink components)
```

Outputs examples:
- Tagged release: `v0.1.0`
- After commits: `v0.1.0-3-gabc1234`
- No tags: `abc1234`
- Dirty: `v0.1.0-dirty`

## Logging

`src/llm/logger.ts` writes to `~/.loopy/logs/YYYY-MM-DD.log`:

```typescript
import { logger } from './llm/logger.js';

logger.info('Message', { optionalData: 'value' });
logger.error('Error occurred', errorObject);
```

Log levels: debug, info, warn, error

## Testing & Verification

`scripts/verify.js` tests:
1. Basic model response (queries "2+2", checks for "4")
2. Tool calling (queries "List files in /tmp", checks tool call count)

Run: `npm run verify [-- --model <model_id>]`

## Common Tasks

### Adding a New Tool

1. Create `src/tools/<tool-name>.ts`
2. Implement using `tool()` with Zod schema
3. Import and add to tools object in `src/llm/client.ts`
4. Add tool name to `config/default.json` tools.enabled
5. Rebuild: `npm run build`

### Adding a New CLI Flag

1. Add parsing logic in `src/index.ts` argument loop
2. Update `printHelp()` with flag documentation
3. Apply flag value where needed
4. Rebuild: `npm run build`

### Adding a New TUI Command

1. Add handler to `commands` in `src/commands/index.ts`
2. Update `HELP_TEXT` constant
3. Rebuild: `npm run build`

### Changing Default Provider/Model

Edit `config/default.json`:

```json
{
  "provider": "openrouter",
  "model": { "name": "openai/gpt-4o-mini" }
}
```

Available providers: `openrouter`, `google`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes* | OpenRouter API key (default provider) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes* | Google AI API key |

*At least one provider key required.

## Important Notes

- ESM modules (`"type": "module"` in package.json) - use `import`/`export`
- Build before testing: `npm run build`
- Ink components use React hooks (`useState`, `useEffect`, etc.)
- TUI uses `<Static>` for message history (better performance)
