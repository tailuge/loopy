# Loopy Code Review

**Review Date:** February 17, 2026  
**Reference:** [Agent-Skills Framework](https://github.com/OpenRouterTeam/agent-skills/blob/main/skills/create-agent/SKILL.md)

---

## Executive Summary

Loopy is a well-structured AI CLI assistant that aligns with many agent-skills framework principles. It features modular architecture, proper tool definitions with Zod schemas, streaming support, and dual interfaces (CLI + TUI). However, it lacks an event-driven agent core with lifecycle hooks, which limits extensibility patterns like HTTP servers, Discord bots, or custom analytics.

---

## ✅ Strengths

| Aspect | Loopy Implementation | Agent-Skills Alignment |
|--------|---------------------|----------------------|
| **Modular architecture** | Separate `llm/`, `tools/`, `commands/`, `components/` directories | ✅ Matches modular skill design |
| **Tool definitions** | Uses `tool()` from AI SDK with Zod schemas | ✅ Same pattern as agent-skills |
| **TypeScript config** | `NodeNext`, `strict`, `ES2022` | ✅ Matches recommended tsconfig |
| **Environment variables** | `.env.local` for API keys (gitignored) | ✅ Security best practice |
| **Streaming support** | `fullStream` with text-delta, tool-call, tool-result events | ✅ Similar items-based model |
| **Dual interfaces** | Traditional CLI + Ink TUI | ✅ Matches optional Ink TUI pattern |

---

## ⚠️ Gaps vs Agent-Skills Framework

### 1. No Agent Core with Event Hooks

**Agent-skills pattern:**
```typescript
const agent = createAgent({ apiKey, tools });
agent.on('message:user', handler);
agent.on('tool:call', handler);
agent.on('stream:delta', handler);
agent.on('reasoning:update', handler);
```

**Loopy:** Uses direct function calls (`streamChat()`) without event hooks.

**Impact:** Limits extensibility patterns:
- ❌ HTTP server (one agent per session)
- ❌ Discord bot (one agent per channel)
- ❌ Custom analytics/logging hooks
- ❌ Webhook integrations

---

### 2. Model Selection Hardcoded

**Loopy config/default.json:**
```json
{
  "model": { "name": "openai/gpt-4o-mini" }
}
```

**Agent-skills recommendation:**
- Use `openrouter/auto` for automatic best-model selection
- **Do not hardcode model IDs** — they change frequently
- Dynamically fetch models via API if needed

---

### 3. Missing Agent API Methods

| Method | Agent-Skills | Loopy |
|--------|-------------|-------|
| `getMessages()` | ✅ Returns conversation history | ❌ No direct access |
| `clearHistory()` | ✅ void | ❌ Only via `/clear` command |
| `setInstructions(text)` | ✅ Update system prompt | ❌ Not supported |
| `addTool(tool)` | ✅ Runtime tool addition | ❌ Tools fixed at startup |
| `sendSync(content)` | ✅ Promise<string> | ✅ `chat()` exists |

---

### 4. Items-Based Streaming Model Incomplete

**Agent-skills pattern:**
```typescript
// Replace items by ID, not accumulate chunks
if (item.id in items) {
  items[item.id] = { ...items[item.id], ...update };
}
```

**Loopy (App.tsx):**
```typescript
// String concatenation approach
assistantText += event.delta;
setStreamingText(assistantText);
```

**Missing item types:**
- ❌ `reasoning` — Extended thinking content
- ❌ `web_search_call` — Web search operations
- ❌ `file_search_call` — File search operations
- ❌ `image_generation_call` — Image generation operations

---

### 5. Tool Registration Not Dynamic

**Loopy (client.ts):**
```typescript
export const tools: Record<string, unknown> = { list_dir: listDir };
```

**Agent-skills pattern:**
```typescript
agent.addTool(myNewTool);  // Runtime addition
```

---

### 6. No Conversation History Persistence

- CLI uses single-turn `generateText()` with no history
- TUI maintains history in React state only
- No persistence between sessions

---

## 🔧 Code Quality Observations

| Issue | Location | Severity |
|-------|----------|----------|
| **Duplicate code** | `src/index.ts` has duplicate `loadEnv()`, `loadConfig()` vs `src/config.ts` | Medium |
| **Duplicate model creation** | `src/index.ts` and `src/llm/client.ts` both create models independently | Medium |
| **Missing error recovery** | Tool errors return `{ error: "..." }` but don't allow retry | Low |
| **No unit tests** | No test files in project | Medium |
| **ESLint disabled** | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` in client.ts | Low |

---

## 📋 Recommendations

### High Priority

1. **Create an Agent Core class** with EventEmitter-based hooks
   - Events: `message:user`, `message:assistant`, `tool:call`, `tool:result`, `stream:delta`, `reasoning:update`, `error`
   - Methods: `send()`, `sendSync()`, `getMessages()`, `clearHistory()`, `setInstructions()`, `addTool()`

2. **Use `openrouter/auto`** as default model instead of hardcoded model IDs

3. **Remove code duplication** between `src/index.ts` and `src/config.ts`

### Medium Priority

4. **Implement progressive item updates** by ID for full items-based streaming support

5. **Add dynamic tool registration** (`addTool()` method on agent)

6. **Add unit tests** for:
   - Tool implementations (`list-dir.ts`)
   - Command handlers (`commands/index.ts`)
   - Config loading (`config.ts`)

### Low Priority

7. **Add conversation history persistence** (optional: store to file/SQLite)

8. **Support additional item types** if needed:
   - `reasoning` for extended thinking
   - `web_search_call`, `file_search_call`, `image_generation_call`

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

### Loopy Architecture
```
┌─────────────────────────────────────────────────────┐
│ CLI / TUI Interfaces                                 │
│                        ↓                            │
│  Direct function calls (streamChat, chat)           │
│                        ↓                            │
│  Vercel AI SDK / OpenRouter SDK                     │
└─────────────────────────────────────────────────────┘
```

---

## Conclusion

Loopy is a **solid, functional implementation** that demonstrates good practices in modular design, tool definitions, and streaming. The primary gap is the lack of an **event-driven agent core**, which is the key enabler for advanced extensibility patterns in the agent-skills framework.

Addressing the high-priority recommendations would bring Loopy closer to the agent-skills architecture while maintaining its current functionality.
