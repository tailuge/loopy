# Loopy Alignment with Kilocode Prompting System

This document outlines the plan to bring loopy's system prompt architecture into alignment with kilocode's modular prompting system.

---

## Executive Summary

| Aspect | Current State | Target State | Effort |
|--------|--------------|--------------|--------|
| **System Prompt** | Single markdown file per mode | Modular assembly from sections | Medium |
| **Tools** | 5 basic tools (adequate) | Enhanced descriptions | Low |
| **Mode Schema** | Simple `{name, content}` | Rich schema with `roleDefinition` | Low |
| **Protocol** | Native only (AI SDK) | Native only (no change) | None |
| **Context Retention** | ✅ Already works | No change needed | None |
| **Tool Groups** | Not implemented | Not needed (all tools for all modes) | None |

---

## Architecture Comparison

### Kilocode System Prompt Assembly

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM PROMPT                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Role Definition (mode-specific)                             │
│  2. Markdown Formatting Rules                                    │
│  3. Tool Use Section (protocol-specific)                        │
│  4. Tools Catalog (mode-filtered)                               │
│  5. Tool Use Guidelines                                         │
│  6. MCP Servers Section (if configured)                         │
│  7. Capabilities Section                                        │
│  8. Modes Section                                               │
│  9. Skills Section (if configured)                              │
│  10. Rules Section                                              │
│  11. System Information Section                                 │
│  12. Objective Section                                          │
│  13. Custom Instructions (user/project-specific)                │
└─────────────────────────────────────────────────────────────────┘
```

### Loopy Target Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM PROMPT                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Role Definition (mode-specific)                             │
│  2. Rules Section (behavioral constraints)                      │
│  3. System Information Section (cwd, shell, OS)                 │
│  4. Objective Section (task methodology)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale for simplification:**
- No MCP servers → Skip sections 6, 9
- Native protocol → Skip sections 3, 5 (AI SDK handles tool calling)
- Single mode context → Skip sections 7, 8
- No custom instructions system yet → Skip section 13 (future work)

---

## Phase 1: Create Prompt Section Generators

### New Files

```
src/prompts/
├── index.ts           # buildSystemPrompt() - assembles sections
├── rules.ts           # getRulesSection() - behavioral rules
├── objective.ts       # getObjectiveSection() - task methodology
├── system-info.ts     # getSystemInfoSection() - runtime context
└── types.ts           # PromptSettings interface
```

### 1.1 rules.ts - Behavioral Rules

Port from `kilocode/src/core/prompts/sections/rules.ts`:

```typescript
export function getRulesSection(cwd: string): string {
  const chainOp = getCommandChainOperator(); // '&&' for bash, ';' for PowerShell
  
  return `====

RULES

- The project base directory is: ${cwd}
- All file paths must be relative to this directory.
- You cannot \`cd\` into a different directory to complete a task.
- Do not use the ~ character or $HOME to refer to the home directory.
- Before executing commands, consider if they should run in a specific directory.
  Prepend with \`cd <path> ${chainOp} <command>\` if needed.
- When making changes to code, always consider the context in which the code is being used.
- Do not ask for more information than necessary. Use the tools provided to accomplish
  the user's request efficiently and effectively.
- You are STRICTLY FORBIDDEN from starting your messages with "Great", "Certainly", 
  "Okay", "Sure". You should NOT be conversational in your responses, but rather 
  direct and to the point.
- Your goal is to accomplish the user's task, NOT engage in a back and forth conversation.
- NEVER end your response with a question or request to engage in further conversation.`;
}
```

### 1.2 objective.ts - Task Methodology

Port from `kilocode/src/core/prompts/sections/objective.ts`:

```typescript
export function getObjectiveSection(): string {
  return `====

OBJECTIVE

You accomplish a given task iteratively, breaking it down into clear steps and 
working through them methodically.

1. Analyze the user's task and set clear, achievable goals to accomplish it.
   Prioritize these goals in a logical order.
2. Work through these goals sequentially, utilizing available tools as necessary.
   Each goal should correspond to a distinct step in your problem-solving process.
3. Remember, you have access to tools that can be used in powerful ways to accomplish
   each goal. Before calling a tool, do some analysis to determine which tool is most
   relevant and whether you have the required parameters.
4. Once you've completed the user's task, provide a concise summary of what was done.`;
}
```

### 1.3 system-info.ts - Runtime Context

Port from `kilocode/src/core/prompts/sections/system-info.ts`:

```typescript
export function getSystemInfoSection(cwd: string): string {
  return `====

SYSTEM INFORMATION

Operating System: ${process.platform}
Default Shell: ${process.env.SHELL || 'unknown'}
Current Working Directory: ${cwd}
Home Directory: ${os.homedir()}`;
}
```

### 1.4 index.ts - Assembler

```typescript
import { getRulesSection } from './rules.js';
import { getObjectiveSection } from './objective.js';
import { getSystemInfoSection } from './system-info.js';
import type { Mode } from '../modes.js';

export interface PromptOptions {
  cwd: string;
}

export function buildSystemPrompt(mode: Mode, options: PromptOptions): string {
  return `${mode.roleDefinition}

${getRulesSection(options.cwd)}

${getSystemInfoSection(options.cwd)}

${getObjectiveSection()}`;
}
```

---

## Phase 2: Update Mode Schema

### 2.1 Expand Mode Interface

Update `src/modes.ts`:

```typescript
export interface Mode {
  slug: string;            // Machine identifier (e.g., "code", "debug")
  name: string;            // Display name (e.g., "Code", "Debug")
  roleDefinition: string;  // Core identity/role
  content?: string;        // Legacy fallback for simple modes
}
```

### 2.2 Update Mode Loading

The existing `loadMode()` function already supports `[[include:filename]]` directives.
Update it to parse roleDefinition from the markdown:

```markdown
# Mode: code

## Role Definition
You are Loopy, a highly skilled software engineer with extensive knowledge 
in many programming languages, frameworks, design patterns, and best practices.

[[include: _rules]]
[[include: _objective]]
```

### 2.3 Create New Mode Files

**modes/code.md:**
```markdown
# Mode: code

## Role Definition
You are Loopy, a highly skilled software engineer with extensive knowledge 
in many programming languages, frameworks, design patterns, and best practices.
```

**modes/_rules.md (include fragment):**
```markdown
## Rules

- The project base directory will be provided at runtime.
- All file paths must be relative to this directory.
- You are STRICTLY FORBIDDEN from starting your messages with "Great", 
  "Certainly", "Okay", "Sure". Be direct and technical.
- Your goal is to accomplish the user's task, NOT engage in conversation.
```

**modes/_objective.md (include fragment):**
```markdown
## Objective

You accomplish tasks iteratively, breaking them down into clear steps and 
working through them methodically. Use available tools efficiently. When 
complete, provide a concise summary without asking follow-up questions.
```

---

## Phase 3: Tools Assessment

### Current Tools (Adequate for Code Mode)

| Tool | Status | Notes |
|------|--------|-------|
| `list_dir` | ✅ Keep | Directory listing |
| `read_file` | ✅ Keep | File reading |
| `write_file` | ✅ Keep | File writing/creation |
| `grep` | ✅ Keep | Content search |
| `shell` | ✅ Keep | Command execution |

### Optional Enhancement: attempt_completion Tool

Kilocode uses `attempt_completion` to signal task completion. This could be added
but is optional since the objective section already instructs the model to
summarize when done.

### Tool Description Improvements

Consider enhancing descriptions with context:

```typescript
// Before
description: 'Read the content of a file'

// After
description: 'Read the content of a file. Returns the full file contents. ' +
  'Use this to examine existing code before making changes.'
```

**Decision:** Keep current tool implementations. Description improvements are
optional and can be done incrementally.

---

## Phase 4: Integrate with Agent

### Update Agent Constructor

```typescript
// src/llm/agent.ts

import { buildSystemPrompt } from '../prompts/index.js';

export class Agent extends EventEmitter {
  constructor(options: AgentOptions) {
    super();
    
    // Build system prompt from mode + runtime context
    const systemPrompt = buildSystemPrompt(
      options.mode, 
      { cwd: options.cwd || process.cwd() }
    );
    
    this.messages.push({ role: 'system', content: systemPrompt });
    // ... rest of constructor
  }
}
```

### Update CLI Entry Point

```typescript
// src/index.ts

const mode = await loadMode(modeOverride || 'code');

const agent = new Agent({
  provider,
  model: modelName,
  maxSteps,
  mode,           // Pass mode object instead of instructions string
  cwd: process.cwd(),
  tools: enabledTools,
});
```

---

## Context Retention Analysis

### Current Implementation (✅ Works)

The `Agent` class already maintains conversation history:

```typescript
class Agent {
  private messages: Message[] = [];
  
  async send(content: string): Promise<void> {
    this.messages.push({ role: 'user', content });
    // ... stream response ...
    this.messages.push({ role: 'assistant', content: assistantText });
  }
  
  clearHistory(): void {
    this.messages = [];
    if (this.instructions) {
      this.messages.push({ role: 'system', content: this.instructions });
    }
  }
}
```

**No changes needed.** Context is preserved between calls in both CLI (single-shot)
and TUI (multi-turn) modes.

---

## Implementation Checklist

### Phase 1: Prompt Sections
- [ ] Create `src/prompts/types.ts` with `PromptOptions` interface
- [ ] Create `src/prompts/rules.ts` with `getRulesSection()`
- [ ] Create `src/prompts/objective.ts` with `getObjectiveSection()`
- [ ] Create `src/prompts/system-info.ts` with `getSystemInfoSection()`
- [ ] Create `src/prompts/index.ts` with `buildSystemPrompt()`

### Phase 2: Mode Schema
- [ ] Update `Mode` interface in `src/modes.ts`
- [ ] Update `loadMode()` to parse roleDefinition
- [ ] Create `modes/code.md` with roleDefinition
- [ ] Create `modes/_rules.md` include fragment
- [ ] Create `modes/_objective.md` include fragment

### Phase 3: Agent Integration
- [ ] Update `Agent` constructor to accept `mode` object
- [ ] Update `Agent` to use `buildSystemPrompt()`
- [ ] Update CLI (`src/index.ts`) to pass mode to Agent
- [ ] Update TUI (`src/components/App.tsx`) to pass mode to Agent

### Phase 4: Testing
- [ ] Test CLI with `--mode code`
- [ ] Test TUI multi-turn conversation context retention
- [ ] Verify behavioral rules are followed (no conversational fillers)
- [ ] Verify task completion behavior

---

## Future Considerations

### Not in Scope (Yet)

1. **Tool Groups** - All modes have access to all tools
2. **XML Protocol** - Native protocol only
3. **MCP Servers** - Not supported
4. **Custom Instructions** - No `.loopy/rules/` loading
5. **Mode Switching** - Single mode per session

### Potential Future Work

1. Add `attempt_completion` tool for explicit task signaling
2. Add `.loopy/rules/` custom instructions loading
3. Add mode-specific tool restrictions (tool groups)
4. Add `/mode` command in TUI for runtime mode switching

---

## References

- `../kilocode/INFOPACK.md` - Kilocode prompting system documentation
- `../kilocode/src/core/prompts/system.ts` - System prompt assembly
- `../kilocode/src/core/prompts/sections/rules.ts` - Rules section
- `../kilocode/src/core/prompts/sections/objective.ts` - Objective section
- `../kilocode/packages/types/src/mode.ts` - Mode configuration schema
