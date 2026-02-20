# Loopy - Project Context

## Project Overview

**Loopy** is an AI-powered CLI assistant built with the Vercel AI SDK. It provides two interfaces:
- **CLI** (`loopy`): Single-shot command-line queries
- **TUI** (`loopy-tui`): Interactive terminal UI using Ink (React for CLIs)

The application supports multiple LLM providers (OpenRouter with 300+ models, Google Gemini) and includes tool-calling capabilities with a modular, event-driven architecture.

## Key Technologies

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 18+ (ESM modules) |
| **Language** | TypeScript 5.7+ |
| **AI SDK** | Vercel AI SDK v6 (`ai` package) |
| **Providers** | OpenRouter, Google Generative AI |
| **TUI Framework** | Ink 6.x (React-based) |
| **Schema Validation** | Zod 4.x |
| **Testing** | Vitest, Node.js test runner |

## Project Structure

```
loopy/
├── bin/                    # Executable entry points
│   ├── loopy              # CLI launcher
│   └── loopy-tui          # TUI launcher
├── config/
│   └── default.json       # Default configuration
├── modes/                  # Mode files (system prompts)
│   ├── default.md
│   ├── coder.md
│   └── ...
├── src/
│   ├── index.ts           # CLI entry point
│   ├── tui.tsx            # TUI entry point
│   ├── config.ts          # Config/env loader
│   ├── modes.ts           # Mode loading/management
│   ├── version.ts         # Git-based versioning
│   ├── llm/
│   │   ├── agent.ts       # Event-driven Agent Core
│   │   ├── client.ts      # LLM client (streamChat, chat)
│   │   ├── types.ts       # TypeScript types
│   │   ├── factory.ts     # Model factory
│   │   └── logger.ts      # File logging
│   ├── commands/
│   │   └── index.ts       # TUI command handlers
│   ├── tools/
│   │   └── list-dir.ts    # Directory listing tool
│   └── components/        # Ink React components
│       ├── App.tsx
│       ├── Banner.tsx
│       ├── InputArea.tsx
│       ├── MessageList.tsx
│       ├── MessageItem.tsx
│       ├── ToolCallDisplay.tsx
│       └── LogPanel.tsx
├── scripts/
│   ├── set-version.sh     # Pre-build version script
│   └── verify.js          # Verification script
├── html/                   # Web interface assets
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Building and Running

### Installation

```bash
npm install
```

### Build

```bash
npm run build        # Compile TypeScript
npm run prebuild     # Run version script (auto-run before build)
```

### Run

```bash
# CLI (single-shot)
./bin/loopy "your query here"
npm run start -- "your query"

# TUI (interactive)
./bin/loopy-tui
npm run start:tui

# Web interface (via ttyd)
./bin/loopy-tui --web
./bin/loopy-tui --web --mdns   # With mDNS/Bonjour support
```

### Development

```bash
npm run typecheck    # TypeScript type checking
npm run test         # Run Node.js tests
npm run test:tui     # Run Vitest tests
npm run verify       # Verify model response and tool calling
npm run clean        # Remove dist/
```

### Configuration

Create `.env.local` in project root:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
# OR
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

Default config (`config/default.json`):

```json
{
  "provider": "openrouter",
  "model": { "name": "openrouter/auto" },
  "defaultMode": "default",
  "tools": { "enabled": ["list_dir"] },
  "maxSteps": 5
}
```

## Architecture

### Agent Core Pattern

The `Agent` class (`src/llm/agent.ts`) is an event-driven core that extends `EventEmitter`:

```typescript
const agent = new Agent({ provider, model, tools, instructions });

// Event hooks
agent.on('message:user', handler);
agent.on('message:assistant', handler);
agent.on('tool:call', (name, input) => { });
agent.on('tool:result', (name, result) => { });
agent.on('stream:delta', (delta) => { });
agent.on('finish', (event) => { });
agent.on('error', (error) => { });

// Methods
await agent.send(content);           // Stream response via events
const resp = await agent.sendSync(content);  // Wait for full response
agent.getMessages();                 // Get history
agent.setMessages(messages);         // Set history
agent.clearHistory();                // Clear (preserves instructions)
agent.setInstructions(text);         // Update system prompt
agent.addTool(name, tool);           // Runtime tool addition
agent.updateConfig(config);          // Update provider/model
```

### Streaming Pattern

```typescript
for await (const event of streamChat(messages, config)) {
  if (event.type === 'text-delta') {
    // Append event.delta
  } else if (event.type === 'tool-call') {
    // Handle tool invocation
  } else if (event.type === 'finish') {
    // Complete with usage stats
  }
}
```

### Modes System

Modes are markdown files in `modes/` that provide different system prompts:

| Mode | Purpose |
|------|---------|
| `default` | General assistant |
| `coder` | Code-focused assistant |
| `shell` | Shell command helper |
| `debugger` | Debugging assistant |
| `reviewer` | Code review assistant |
| `tester` | Testing assistant |
| `architect` | System design assistant |
| `refactor` | Refactoring assistant |
| `security` | Security-focused assistant |
| `performance` | Performance optimization |
| `writer` | Writing assistant |
| `api-docs` | API documentation |
| `complexity` | Complexity analysis |

**Switching modes:**
- CLI: `--mode <name>` flag
- TUI: `/mode <name>` command, `/modes` to list, TAB to cycle

### TUI Commands

| Command | Description |
|---------|-------------|
| `/exit`, `/quit`, `/q` | Exit TUI |
| `/help`, `/?` | Show help |
| `/list-models` | List available models |
| `/model <name>` | Switch model |
| `/provider <name>` | Switch provider |
| `/clear` | Clear conversation |
| `/mode <name>` | Switch mode |
| `/modes` | List modes |
| `/log` | Toggle log panel |
| TAB | Cycle through modes |
| \` (backtick) | Toggle log panel |

## Development Conventions

### Adding a New Tool

1. Create `src/tools/<tool-name>.ts`:
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

2. Import and add to `tools` export in `src/llm/client.ts`
3. Add tool name to `config/default.json` → `tools.enabled`
4. Rebuild: `npm run build`

### Adding a New CLI Flag

1. Add parsing in `src/index.ts` argument loop
2. Update `printHelp()` with documentation
3. Apply flag value where needed
4. Rebuild

### Adding a New TUI Command

1. Add handler to `commands` object in `src/commands/index.ts`
2. Update `HELP_TEXT` constant
3. Rebuild

### TypeScript Configuration

- Module system: `NodeNext` with ESM
- Target: `ES2022`
- Strict mode enabled
- JSX: `react-jsx`
- Output: `dist/`

### Testing Practices

- Unit tests use Node.js test runner (`**/*.test.ts`)
- TUI component tests use Vitest (`**/*.test.tsx`)
- Test files mirror source structure (e.g., `src/llm/agent.test.ts`)
- Run verification with `npm run verify` before committing

## Logging

Logs are written to `~/.loopy/logs/YYYY-MM-DD.log`:

```typescript
import { logger } from './llm/logger.js';

logger.info('Message', { optionalData: 'value' });
logger.error('Error occurred', errorObject);
logger.debug('Debug info');
logger.warn('Warning');
```

## Important Notes

- **ESM modules**: Use `import`/`export` syntax (no CommonJS)
- **Build required**: Always run `npm run build` after changes
- **Agent state**: The `Agent` class maintains internal state; avoid recreating unnecessarily
- **React state sync**: TUI syncs React state with Agent history—be mindful of dual state management
- **Version**: Auto-generated from git tags via `scripts/set-version.sh`
- **mDNS**: Web interface supports `.local` domain with `--mdns` flag

## Known Issues

1. **Agent memoization bug** in `App.tsx`: `useMemo` dependencies incomplete (missing `provider`, `model`)
2. **Dual state management**: Both React and Agent maintain message history
3. **Missing `reasoning:update` event**: Not implemented in Agent class
4. **No conversation persistence**: History lost between sessions

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes* | OpenRouter API key (default provider) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes* | Google AI API key |

*At least one provider key is required.
