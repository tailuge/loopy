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
├── modes.ts           # Mode loading with system info generation
├── llm/
│   ├── client.ts      # Streaming LLM client + tool registration
│   ├── agent.ts       # Agent class with conversation history
│   ├── types.ts       # Message, StreamEvent, LLMConfig types
│   └── logger.ts      # File logging to ~/.loopy/logs/
├── commands/
│   ├── index.ts       # Command handlers for TUI
│   └── list-models.ts # Model listing functions
├── tools/
│   ├── list-dir.ts    # list_dir tool
│   ├── read-file.ts   # read_file tool (with line numbers)
│   ├── write-file.ts  # write_file tool
│   ├── apply-diff.ts  # apply_diff tool (SEARCH/REPLACE blocks)
│   ├── grep.ts        # grep tool
│   └── shell.ts       # shell tool
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
4. Mode file loaded with system info generated at runtime

## Modes

Loopy supports two modes, each with specific tool access:

| Mode | Description | Tools |
|------|-------------|-------|
| `code` | Full coding assistant | list_dir, read_file, write_file, apply_diff, grep, shell |
| `plan` | Read-only planning mode | list_dir, read_file, grep |

Mode files are in `modes/` directory:
- `code.md` - Main coding mode
- `plan.md` - Read-only planning mode
- `_rules.md` - Shared behavioral rules
- `_objective.md` - Task methodology
- `_system_info.md` - Generated at runtime (OS, shell, cwd, homedir)

### Mode Loading

```typescript
import { loadMode, getToolsForMode } from './modes.js';

const mode = await loadMode('code');  // Generates _system_info.md
// mode.name = 'code'
// mode.content = full system prompt with includes resolved
// mode.tools = ['list_dir', 'read_file', 'write_file', 'apply_diff', 'grep', 'shell']
```

### System Info Generation

When a mode is loaded, `_system_info.md` is generated with:
- Operating System
- Default Shell
- Current Working Directory
- Home Directory

## Tools

### read_file

Returns file content with line numbers prepended (format: `  1 | content`):

```
1 | first line
2 | second line
3 | third line
```

Use the line numbers with `apply_diff` for surgical edits.

### apply_diff

Applies SEARCH/REPLACE blocks with line numbers:

```
<<<<<<< SEARCH
:start_line:123
-------
[exact content to find]
=======
[new content to replace with]
>>>>>>> REPLACE
```

The `:start_line:` must match the line number from `read_file` output.

### write_file

Creates new files or completely rewrites existing files. For surgical edits, prefer `apply_diff`.

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

// Available tools
export const tools: Record<string, unknown> = {
  list_dir, read_file, write_file, apply_diff, grep, shell
};
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
  '/mode': (args, context) => { /* ... */ },
  '/modes': (_, context) => { /* ... */ },
};

export async function handleCommand(input: string, context: CommandContext): Promise<CommandResult>
```

CommandResult types:
- `{ type: 'continue' }` - No action needed
- `{ type: 'exit' }` - Exit the TUI
- `{ type: 'message'; content: string }` - Send as user message to LLM
- `{ type: 'output'; content: string }` - Display output to user

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
5. Update `MODE_TOOLS` in `src/modes.ts` if tool should be mode-specific
6. Rebuild: `npm run build`

### Adding a New Mode

1. Create `modes/<mode-name>.md` with role definition and includes
2. Add mode to `MODE_TOOLS` in `src/modes.ts` with allowed tools
3. Rebuild: `npm run build`

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
  "model": { "name": "openai/gpt-4o-mini" },
  "defaultMode": "code"
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
- Mode-specific tools are filtered by `MODE_TOOLS` in `src/modes.ts`
