# AGENTS.md

Guidance for AI agents working on the loopy codebase.

## Project Overview

loopy is a CLI assistant that uses the Vercel AI SDK to interact with LLM models (primarily Google Gemini). It supports tool calling and is designed for extensibility.

## Key Technologies

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript
- **AI SDK**: Vercel AI SDK v6 (`ai` package)
- **Provider**: Google Generative AI (`@ai-sdk/google`)
- **Schema Validation**: Zod

## Architecture

### Entry Points

- `bin/loopy` - Shell wrapper that imports `dist/index.js`
- `src/index.ts` - Main CLI logic with argument parsing and LLM interaction

### Configuration Flow

1. Load `.env.local` for API credentials
2. Load `config/default.json` for model/tools/maxSteps settings
3. CLI flags override config values

### Tool System

Tools are defined using the AI SDK's `tool()` function:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    // Tool implementation
    return result;
  },
});
```

Register tools in `src/index.ts`:

```typescript
const result = await generateText({
  model: google(modelName),
  prompt: prompt.join(' '),
  tools: { my_tool: myTool },
  stopWhen: stepCountIs(maxSteps),
});
```

## CLI Flag Parsing

Flags are parsed manually in `src/index.ts`. When adding new flags:

1. Add to the argument parsing loop
2. Update `printHelp()` function
3. Apply flag value to relevant function

## AI SDK Patterns

### generateText

Used for single-turn and multi-step interactions:

```typescript
const result = await generateText({
  model: google(modelName),
  prompt: 'User prompt',
  tools: { ... },
  stopWhen: stepCountIs(maxSteps),
});

// Access results
result.text          // Generated text
result.steps         // All steps (for multi-step)
result.finishReason  // 'stop', 'tool-calls', etc.
result.usage         // Token counts
```

### Step Results

Each step contains:

- `step.request.body` - Request payload sent to provider
- `step.response.headers` - Response headers
- `step.response.body` - Raw response body
- `step.toolCalls` - Tool calls made in this step

## Testing & Verification

The `scripts/verify.js` script tests:

1. Basic model response (queries "2+2", checks for "4")
2. Tool calling (queries "List files in /tmp", checks tool call count)

Run with: `npm run verify [-- --model <model_id>]`

## Common Tasks

### Adding a New Tool

1. Create `src/tools/<tool-name>.ts`
2. Implement using `tool()` with Zod schema
3. Import and add to tools object in `src/index.ts`
4. Add tool name to `config/default.json` tools.enabled
5. Rebuild: `npm run build`

### Adding a New CLI Flag

1. Add parsing logic in `main()` function
2. Update `printHelp()` with flag documentation
3. Apply flag value where needed
4. Rebuild: `npm run build`

### Changing Default Model

Edit `config/default.json`:

```json
{
  "model": { "name": "gemini-2.5-flash" }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Google AI API key |

## Important Notes

- The project uses ESM modules (`"type": "module"` in package.json)
- Use `import`/`export` syntax, not `require()`
- Build before testing changes: `npm run build`
- The verify script tests both response and tool calling
