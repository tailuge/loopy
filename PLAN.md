# Loopy TUI Implementation Plan

## Overview

Add a new TUI executable (`loopy-tui`) that provides an interactive coding agent interface using Ink (React for CLIs). The implementation refactors LLM logic into a separate module for code reuse between the existing CLI and new TUI.

## Framework & Architecture Decisions

- **Framework**: Ink (React-based, Node.js compatible, mature ecosystem)
- **Architecture**: Separate LLM module (both CLIs share logic)
- **Streaming**: Yes - real-time text display as generated
- **Logging**: Both file logging + UI toggle with `` key
- **Banner**: Simple ASCII box at startup

---

## Phase 1: LLM Module Refactor

### File Structure

```
src/llm/
├── types.ts      # Message, Conversation, StreamEvent types
├── tools.ts      # Tool exports
├── client.ts     # Streaming LLM client with conversation history
└── logger.ts     # File logging to ~/.loopy/logs/
```

### types.ts

```typescript
export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool-call'; toolName: string; input: unknown }
  | { type: 'tool-result'; toolName: string; result: unknown }
  | { type: 'done'; messages: Message[] };

export interface LLMConfig {
  provider: string;
  model: string;
  maxSteps: number;
  tools: Record<string, unknown>;
}
```

### client.ts

Key exports:
- `streamChat(messages, config)` - AsyncGenerator yielding StreamEvent
- `chat(messages, config)` - Single-turn completion
- `createModel(provider, modelName)` - Model factory

### logger.ts

- Log directory: `~/.loopy/logs/YYYY-MM-DD.log`
- Log levels: debug, info, warn, error
- Entries include: timestamp, level, message, metadata

---

## Phase 2: Version System

### src/version.ts

Git-based versioning with fallback to package.json:

```typescript
import { execSync } from 'child_process';

export function getVersion(): string {
  try {
    return execSync('git describe --tags --always --dirty', { encoding: 'utf-8' }).trim();
  } catch {
    return require('../package.json').version;
  }
}
```

Example outputs:
- Tagged release: `v0.1.0`
- After 3 commits: `v0.1.0-3-gabc1234`
- No tags: `abc1234`
- Dirty working dir: `v0.1.0-dirty`

Both `loopy --version` and `loopy-tui --version` use this.

---

## Phase 3: Commands Module

### src/commands/index.ts

Commands supported in TUI:

| Command | Aliases | Action |
|---------|---------|--------|
| `/exit` | `/quit`, `/q` | Exit TUI |
| `/help` | `/?` | Show available commands |
| `/list-models` | - | List models (reuse existing code) |
| `/model <name>` | - | Switch model |
| `/provider <name>` | - | Switch provider |
| `/clear` | - | Clear conversation history |
| `/log` | - | Toggle log panel |

Implementation pattern:
```typescript
const COMMANDS: Record<string, CommandHandler> = {
  '/exit': () => process.exit(0),
  '/quit': () => process.exit(0),
  '/q': () => process.exit(0),
  // ... more commands
};

function handleCommand(input: string, context: CommandContext) {
  const [cmd, ...args] = input.split(' ');
  const handler = COMMANDS[cmd];
  return handler?.(args, context) ?? showUnknownCommand(cmd);
}
```

---

## Phase 4: TUI Components

### File Structure

```
src/components/
├── App.tsx           # Main layout with log panel toggle
├── Banner.tsx        # Simple ASCII box banner at startup
├── MessageList.tsx   # Scrollable message history (Static)
├── MessageItem.tsx   # Single message display with role color
├── ToolCallDisplay.tsx # Inline tool visualization
├── InputArea.tsx     # User input with up/down history
└── LogPanel.tsx     # Toggleable log overlay (backtick key)
```

### App.tsx - Main Layout

```tsx
<Box flexDirection="column" height="100%">
  <Banner />
  <MessageList messages={messages} />
  {showLog && <LogPanel />}
  <InputArea onSubmit={handleSubmit} loading={isLoading} />
</Box>
```

### Banner.tsx - Startup Banner

Simple ASCII box:
```
╔═══════════════════════════════════════╗
║  Loopy - AI CLI Assistant             ║
╚═══════════════════════════════════════╝
Version: v0.1.0-3-gabc1234
Type /help for commands
```

### MessageList.tsx - Message History

- Uses `<Static>` for historical messages (better performance)
- Current streaming message rendered separately
- Auto-scrolls to bottom on new messages

### MessageItem.tsx - Single Message

```tsx
<Box>
  <Text bold color={roleColor}>{role}: </Text>
  <Text>{content}</Text>
</Box>
```

Role colors:
- user: cyan
- assistant: green
- system: yellow

### ToolCallDisplay.tsx - Tool Visualization

Shows inline:
```
[Tool: list_dir] path: /tmp
→ Result: [{ name: "file1", type: "file" }, ...]
```

### InputArea.tsx - User Input

- TextInput component for entry
- Up/down arrows navigate command history
- Shows loading state while LLM responds

```typescript
const [history, setHistory] = useState<string[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

useInput((input, key) => {
  if (key.upArrow) {
    // Navigate back through history
  }
  if (key.downArrow) {
    // Navigate forward through history
  }
});
```

### LogPanel.tsx - Log Overlay

- Toggled with `` (backtick) key
- Shows recent log entries
- Scrollable if needed

---

## Phase 5: Executables & Configuration

### bin/loopy-tui

```bash
#!/usr/bin/env node
import('../dist/tui.js');
```

### package.json Updates

```json
{
  "bin": {
    "loopy": "./bin/loopy",
    "loopy-tui": "./bin/loopy-tui"
  },
  "dependencies": {
    "ink": "^5.0.0",
    "react": "^18.2.0",
    "ink-text-input": "^6.0.0",
    "ai": "^6.0.86",
    "@ai-sdk/google": "^3.0.29",
    "@openrouter/ai-sdk-provider": "^2.2.3",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.5",
    "@types/react": "^18.2.0",
    "typescript": "^5.7.3"
  }
}
```

---

## Additional Features

### Text Selection & Copy

- Handled by terminal emulator (no app code needed)
- Users can select text with mouse in iTerm2, Kitty, Windows Terminal, etc.
- Most terminals support `copyOnSelect` setting

### Streaming Loop Pattern

```typescript
const result = streamText({ model, messages, tools });
for await (const part of result.fullStream) {
  if (part.type === 'text-delta') {
    yield { type: 'text', delta: part.textDelta };
  } else if (part.type === 'tool-call') {
    yield { type: 'tool-call', toolName: part.toolName, input: part.args };
  }
}
```

### Message History Management

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [streamingText, setStreamingText] = useState('');

// On submit:
setMessages(prev => [...prev, { role: 'user', content: input }]);
for await (const event of streamChat([...messages, userMsg], config)) {
  if (event.type === 'text') {
    setStreamingText(prev => prev + event.delta);
  }
}
```

---

## Final File Structure

```
src/
├── index.ts              # Current CLI (updated to use llm/)
├── tui.tsx               # TUI entry point
├── version.ts            # Git-based version
├── llm/
│   ├── client.ts         # Streaming LLM client
│   ├── tools.ts          # Tool exports
│   ├── types.ts          # Types
│   └── logger.ts         # File logging
├── commands/
│   └── index.ts          # Command handlers
├── tools/
│   └── list-dir.ts       # Existing
└── components/
    ├── App.tsx           # Main TUI layout
    ├── Banner.tsx        # Startup banner
    ├── MessageList.tsx   # Scrollable message history
    ├── MessageItem.tsx   # Single message display
    ├── ToolCallDisplay.tsx
    ├── InputArea.tsx     # User input with history
    └── LogPanel.tsx      # Toggleable log overlay
bin/
├── loopy                 # Existing
└── loopy-tui             # New TUI executable
config/
└── default.json          # Existing
```

---

## Implementation Order

1. Phase 1: LLM module (types, tools, client, logger)
2. Phase 2: Version system
3. Phase 3: Commands module
4. Phase 4: TUI components
5. Phase 5: Executables and package.json
6. Update existing CLI to use LLM module
7. Build and verify
