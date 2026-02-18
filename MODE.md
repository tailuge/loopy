# Modes Feature Plan

## Overview

Add a "modes" system where each mode provides a different system prompt. Modes are stored as `.md` files in `modes/` directory and can be switched via CLI flag, TUI command, or TAB key.

---

## Requirements

| Feature | Interface | Trigger |
|---------|-----------|---------|
| Default mode | CLI + TUI | Loaded from config |
| `--mode <name>` | CLI | Command line flag |
| `/mode <name>` | TUI | Command |
| `/modes` | TUI | Command to list available modes |
| TAB key | TUI | Cycle through modes |
| `[mode] >` indicator | TUI | Input prompt prefix |

---

## Architecture

### Directory Structure

```
loopy/
├── modes/
│   ├── default.md      # Default assistant mode
│   ├── coder.md        # Code-focused assistant
│   └── shell.md        # Shell command helper
├── src/
│   ├── modes.ts        # Mode loading/management
│   └── ...
└── config/
    └── default.json    # Add defaultMode field
```

### Mode File Format

```markdown
# Mode: coder
You are an expert programmer. Focus on clean, efficient code...
```

First line `# Mode: <name>` is optional metadata. Rest is system prompt.

---

## Implementation Plan

### 1. Create Mode Loader Module (`src/modes.ts`)

```typescript
export interface Mode {
  name: string;
  content: string;
}

export async function loadMode(name: string): Promise<Mode>;
export async function listModes(): Promise<string[]>;
export async function getMode(name: string): Promise<Mode | null>;
```

**Implementation:**
- Read `modes/*.md` files from project root
- Parse mode name from filename (without `.md` extension)
- Return mode content as system prompt string
- Handle missing modes gracefully

### 2. Update Config (`config/default.json`)

```json
{
  "provider": "openrouter",
  "model": { "name": "openrouter/auto" },
  "defaultMode": "default",
  "tools": { "enabled": ["list_dir"] },
  "maxSteps": 5
}
```

### 3. Update Agent Integration

Agent already supports `instructions` in constructor and `setInstructions()` method:

```typescript
// Already exists in Agent class
constructor(options: AgentOptions) {
  this.instructions = options.instructions;
  // ...
}

setInstructions(text: string): void {
  this.instructions = text;
  this.clearHistory();  // Resets history with new system prompt
}
```

**Changes needed:**
- App.tsx passes mode content to Agent on mode change
- Call `agent.setInstructions(modeContent)` when switching modes

### 4. Update InputArea Component

```typescript
interface InputAreaProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  mode: string;  // NEW: current mode name
}

// Render:
<Box>
  <Text dimColor>[{mode}]</Text>
  <Text> ></Text>
  <TextInput ... />
</Box>
```

### 5. Update App.tsx

**New state:**
```typescript
const [mode, setMode] = useState('default');
const [modes, setModes] = useState<string[]>([]);
const [modeContent, setModeContent] = useState<string>('');
```

**Load modes on mount:**
```typescript
useEffect(() => {
  const loadedModes = await listModes();
  setModes(loadedModes);
  
  const defaultMode = await loadMode(config.defaultMode || 'default');
  setMode(defaultMode.name);
  setModeContent(defaultMode.content);
  // Pass to agent
}, []);
```

**TAB handling:**
```typescript
useInput((input, key) => {
  if (key.tab && !isLoading) {
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    switchMode(nextMode);
  }
});
```

**Mode switching function:**
```typescript
const switchMode = async (newModeName: string) => {
  const newMode = await loadMode(newModeName);
  setMode(newMode.name);
  setModeContent(newMode.content);
  agent.setInstructions(newMode.content);
  // Clear history on mode change? Option A: Yes. Option B: No.
};
```

### 6. Add CLI `--mode` Flag (`src/index.ts`)

```typescript
// Add to argument parsing
let modeOverride: string | undefined;
// ...
else if (arg === '--mode') {
  modeOverride = args[++i];
}

// Load mode and pass to Agent
const mode = await loadMode(modeOverride || config.defaultMode || 'default');
const agent = new Agent({
  provider,
  model: modelName,
  maxSteps,
  instructions: mode.content,
  tools: { list_dir: listDir },
});
```

### 7. Add TUI Commands (`src/commands/index.ts`)

**Update CommandContext:**
```typescript
export interface CommandContext {
  // ... existing fields
  mode: string;
  setMode: (mode: string) => void;
  modes: string[];
}
```

**New commands:**
```typescript
'/mode': (args, context) => {
  if (args.length === 0) {
    return { type: 'output', content: `Current mode: ${context.mode}\nAvailable: ${context.modes.join(', ')}` };
  }
  const newMode = args[0].toLowerCase();
  if (!context.modes.includes(newMode)) {
    return { type: 'output', content: `Unknown mode: ${newMode}\nAvailable: ${context.modes.join(', ')}` };
  }
  context.setMode(newMode);
  return { type: 'output', content: `Mode switched to: ${newMode}` };
},

'/modes': (_, context) => {
  const current = context.mode;
  const list = context.modes.map(m => m === current ? `* ${m}` : `  ${m}`).join('\n');
  return { type: 'output', content: `Available modes:\n${list}` };
},
```

### 8. Update Help Text

Add to HELP_TEXT in `src/commands/index.ts`:
```
  /mode <name>        Switch mode (system prompt)
  /modes              List available modes
```

Add to `src/index.ts` printHelp():
```
  --mode <name>       Set mode (system prompt preset)
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Mode file missing | Fall back to `default`, show warning |
| Empty modes directory | Use built-in default prompt |
| Invalid mode name | Show error, keep current mode |
| Mode switch mid-conversation | Clear history (per `setInstructions()` behavior) |

---

## Open Questions

1. **Clear history on mode switch?**
   - Current `setInstructions()` clears history
   - Alternative: Keep history, just update system prompt
   - **Recommendation:** Clear history (modes are distinct contexts)

2. **Built-in default mode or file-based?**
   - Option A: `modes/default.md` must exist
   - Option B: Hardcoded fallback if file missing
   - **Recommendation:** Option B (hardcoded fallback for resilience)

3. **Mode-specific tools?**
   - Future: Different modes could enable different tools
   - **For now:** All tools available in all modes

---

## File Changes Summary

| File | Action |
|------|--------|
| `modes/default.md` | Create |
| `modes/coder.md` | Create (example) |
| `modes/shell.md` | Create (example) |
| `src/modes.ts` | Create |
| `config/default.json` | Add `defaultMode` field |
| `src/index.ts` | Add `--mode` flag, load mode |
| `src/tui.tsx` | No changes needed |
| `src/components/App.tsx` | Add mode state, TAB handling |
| `src/components/InputArea.tsx` | Add mode prop, display indicator |
| `src/commands/index.ts` | Add `/mode`, `/modes` commands |

---

## Execution Order

1. Create `modes/` directory with sample mode files
2. Create `src/modes.ts` module
3. Update `config/default.json`
4. Update `src/index.ts` for CLI `--mode` flag
5. Update `src/components/InputArea.tsx` for mode indicator
6. Update `src/commands/index.ts` for `/mode` and `/modes`
7. Update `src/components/App.tsx` for mode state and TAB handling
8. Update help text in both CLI and TUI
9. Test all interfaces