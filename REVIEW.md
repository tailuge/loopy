# Loopy Code Review

**Review Date:** February 18, 2026  
**Reference:** [Agent-Skills Framework](https://github.com/OpenRouterTeam/agent-skills/blob/main/skills/create-agent/SKILL.md)

---

## Executive Summary

Loopy now includes an **event-driven Agent Core** (`src/llm/agent.ts`) that addresses the primary gap identified in the original review. The implementation follows the agent-skills pattern with EventEmitter-based hooks, enabling extensibility patterns like HTTP servers, Discord bots, and custom analytics.

---

## ✅ Completed Improvements

### 1. Agent Core with Event Hooks ✅

**Implemented in `src/llm/agent.ts`:**

```typescript
const agent = new Agent({ provider, model, tools });
agent.on('message:user', handler);
agent.on('message:assistant', handler);
agent.on('tool:call', handler);
agent.on('tool:result', handler);
agent.on('stream:delta', handler);
agent.on('finish', handler);
agent.on('error', handler);
agent.on('tool:added', handler);
agent.on('history:cleared', handler);
agent.on('history:updated', handler);
```

**Methods implemented:**
| Method | Status |
|--------|--------|
| `send(content)` | ✅ Async streaming via events |
| `sendSync(content)` | ✅ Returns `Promise<SyncResponse>` |
| `getMessages()` | ✅ Returns conversation history |
| `setMessages(messages)` | ✅ Sets history directly |
| `clearHistory()` | ✅ Clears (preserves system instructions) |
| `setInstructions(text)` | ✅ Updates system prompt |
| `addTool(name, tool)` | ✅ Runtime tool addition |
| `updateConfig(config)` | ✅ Update provider/model at runtime |

### 2. Model Selection Changed to `openrouter/auto` ✅

`config/default.json`:
```json
{
  "provider": "openrouter",
  "model": { "name": "openrouter/auto" }
}
```

### 3. Code Duplication Removed ✅

`src/index.ts` now imports from `src/config.ts`:
```typescript
import { loadEnv, loadConfig } from './config.js';
```

### 4. Unit Tests Added (Partial) ✅

`src/llm/agent.test.ts` tests:
- Agent extends EventEmitter
- History management (getMessages, clearHistory)
- Tool addition with event emission
- Config updates
- Message setting

### 5. Factory Module Extracted ✅

`src/llm/factory.ts` centralizes model creation, removing duplication between `index.ts` and `client.ts`.

---

## ✅ Strengths (Updated)

| Aspect | Loopy Implementation | Agent-Skills Alignment |
|--------|---------------------|----------------------|
| **Modular architecture** | Separate `llm/`, `tools/`, `commands/`, `components/` directories | ✅ Matches modular skill design |
| **Tool definitions** | Uses `tool()` from AI SDK with Zod schemas | ✅ Same pattern as agent-skills |
| **TypeScript config** | `NodeNext`, `strict`, `ES2022` | ✅ Matches recommended tsconfig |
| **Environment variables** | `.env.local` for API keys (gitignored) | ✅ Security best practice |
| **Streaming support** | `fullStream` with text-delta, tool-call, tool-result events | ✅ Similar items-based model |
| **Dual interfaces** | Traditional CLI + Ink TUI | ✅ Matches optional Ink TUI pattern |
| **Event-driven Agent Core** | `Agent` class with EventEmitter | ✅ Full alignment |
| **Dynamic tool registration** | `addTool()` method at runtime | ✅ Full alignment |
| **History management** | `getMessages()`, `clearHistory()`, `setMessages()` | ✅ Full alignment |

---

## ⚠️ Remaining Gaps

### 1. Missing `reasoning:update` Event

The Agent class does not emit `reasoning:update` for extended thinking content. This event was recommended but not implemented.

**Location:** `src/llm/agent.ts`

### 2. Items-Based Streaming Model Incomplete

Still uses string concatenation instead of item-based updates by ID:

```typescript
// agent.ts line 63
assistantText += event.delta;
```

**Missing item types:**
- ❌ `reasoning` — Extended thinking content
- ❌ `web_search_call` — Web search operations
- ❌ `file_search_call` — File search operations
- ❌ `image_generation_call` — Image generation operations

### 3. No Conversation History Persistence

- CLI uses single-turn with no history persistence
- TUI maintains history in React state only
- No persistence between sessions

### 4. Missing Test Script in package.json

Test file exists (`src/llm/agent.test.ts`) but cannot be run:
```json
// Missing in package.json scripts:
"test": "node --test dist/llm/agent.test.js"
```

### 5. Incomplete Test Coverage

**Existing:**
- ✅ `src/llm/agent.test.ts` - Agent class tests

**Missing:**
- ❌ Tool implementations (`list-dir.ts`)
- ❌ Command handlers (`commands/index.ts`)
- ❌ Config loading (`config.ts`)
- ❌ Client functions (`streamChat`, `chat`)

---

## 🐛 Issues Found in Implementation

### 1. Agent Memoization Bug in App.tsx

```typescript
// Line 59-68
const agent = useMemo(() => {
  if (!configLoaded || !config) return null;
  const a = new Agent({
    provider,   // Stale closure - not in deps!
    model,      // Stale closure - not in deps!
    maxSteps: config.maxSteps,
    tools: config.tools,
  });
  return a;
}, [configLoaded]); // Missing: provider, model, config
```

The `useMemo` dependencies are incomplete. The separate `useEffect` that calls `updateConfig()` is a workaround but indicates the memoization pattern is incorrect.

**Fix:** Either add dependencies or remove memoization entirely since Agent is stateful.

### 2. Dual State Management (Agent vs React)

The code has this conflict:

```typescript
// App.tsx manages history in React state
const [messages, setMessages] = useState<Message[]>([]);

// But also syncs to Agent before sending
agent.setMessages(messages);
agent.send(result.content);
```

Both React and Agent maintain separate message history, leading to potential sync issues. The Agent should be the single source of truth.

**Recommendation:** Use Agent's history as the source of truth and derive React state from it.

### 3. ESLint Still Disabled

Still present in codebase:
- `src/llm/factory.ts` line 7: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- `src/llm/types.ts` line 49: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

### 4. Tool Error Recovery Not Addressed

Tool errors return `{ error: "..." }` but don't allow retry. No error recovery mechanism implemented.

---

## 📋 Updated Recommendations

### High Priority

1. ~~Create an Agent Core class~~ ✅ DONE
2. ~~Use `openrouter/auto`~~ ✅ DONE
3. ~~Remove code duplication~~ ✅ DONE
4. **Fix Agent memoization bug** in `App.tsx` - add missing dependencies or remove memoization

### Medium Priority

5. **Resolve dual state management** - make Agent the single source of truth for history
6. **Add test script to package.json**:
   ```json
   "test": "node --test dist/**/*.test.js"
   ```
7. **Add unit tests** for:
   - Tool implementations (`list-dir.ts`)
   - Command handlers (`commands/index.ts`)
   - Config loading (`config.ts`)
8. **Implement progressive item updates** by ID for full items-based streaming support
9. **Add `reasoning:update` event** to Agent class

### Low Priority

10. **Add conversation history persistence** (optional: store to file/SQLite)
11. **Support additional item types**:
    - `reasoning` for extended thinking
    - `web_search_call`, `file_search_call`, `image_generation_call`
12. **Address ESLint warnings** - use proper types instead of `any`

---

## Architecture Comparison

### Agent-Skills Architecture
```
┌─────────────────────────────────────────────────────┐
│ Your Application                                     │
├─────────────────────────────────────────────────────┤
│  Interfaces (Ink TUI / HTTP API / Discord)          │
│                        ↓                            │
│  Agent Core (hooks & lifecycle) ← EventEmitter      │
│                        ↓                            │
│  OpenRouter SDK                                     │
└─────────────────────────────────────────────────────┘
```

### Loopy Architecture (Current)
```
┌─────────────────────────────────────────────────────┐
│ CLI / TUI Interfaces                                 │
│                        ↓                            │
│  Agent Core (EventEmitter hooks) ← NEW              │
│                        ↓                            │
│  Vercel AI SDK / OpenRouter SDK                     │
└─────────────────────────────────────────────────────┘
```

---

## Conclusion

Loopy now has the **event-driven agent core** that was the primary gap. The high-priority recommendations have been addressed. Remaining work focuses on:

1. **Fixing the React/Agent state sync bug** (high priority)
2. **Adding proper test infrastructure** (medium priority)
3. **Implementing item-based streaming** for complex multi-modal responses (medium priority)

The codebase is well-positioned for advanced extensibility patterns like HTTP servers or Discord bots using the Agent class's event hooks.
