import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { listDir } from './tools/list-dir.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

async function loadEnv() {
  try {
    const content = await readFile(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  } catch {
    // .env.local doesn't exist, that's ok
  }
}

interface Config {
  provider?: string;
  model: { name: string };
  tools: { enabled: string[] };
  maxSteps?: number;
}

async function loadConfig(): Promise<Config> {
  const configPath = join(__dirname, '..', 'config', 'default.json');
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      model: { name: 'gemini-2.5-flash' },
      tools: { enabled: ['list_dir'] },
      maxSteps: 5,
    };
  }
}

function printHelp() {
  console.log(`
loopy - AI-powered CLI assistant

Usage:
  loopy [options] <prompt>

Options:
  --help                Show this help message
  --verbose             Show detailed output (token usage, tool calls)
  --debug               Show raw JSON payloads (request body, response body, headers)
  --model <model_id>    Override model (e.g., gemini-2.5-flash)
  --max-steps <n>       Maximum number of LLM steps (default: 5)
  --provider <name>     Provider to use: openrouter (default) or google
  --list-models         List available models from current provider

Examples:
  loopy "1+1=?"
  loopy --verbose "List files in /tmp"
  loopy --debug "1+1=?"
  loopy --max-steps 1 "Simple question"
  loopy --max-steps 10 "Complex multi-step task"
  loopy --model gemini-2.5-flash "Hello"
  loopy --list-models
`);
}

async function listGoogleModels(): Promise<void> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY not set in .env.local');
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as { models: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    
    const textModels = data.models
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => {
        const versionA = parseFloat(a.match(/\d+\.?\d*/)?.[0] || '0');
        const versionB = parseFloat(b.match(/\d+\.?\d*/)?.[0] || '0');
        return versionB - versionA;
      });
    
    console.log('Available Google Generative AI models:\n');
    textModels.forEach(m => console.log(`  ${m}`));
    console.log(`\nTotal: ${textModels.length} models`);
  } catch (error) {
    console.error('Error fetching models:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function listOpenRouterModels(): Promise<void> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { data: Array<{ id: string }> };
    const models = data.data.map(m => m.id).sort();
    console.log('Available OpenRouter models:\n');
    models.forEach(m => console.log(`  ${m}`));
    console.log(`\nTotal: ${models.length} models`);
  } catch (error) {
    console.error('Error fetching models:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main() {
  await loadEnv();
  
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  const args = process.argv.slice(2);
  
  let verbose = false;
  let debug = false;
  let modelOverride: string | undefined;
  let maxStepsOverride: number | undefined;
  let providerOverride: string | undefined;
  let prompt: string[] = [];
  let listModels = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--debug' || arg === '-d') {
      debug = true;
    } else if (arg === '--list-models') {
      listModels = true;
    } else if (arg === '--model' || arg === '-m') {
      modelOverride = args[++i];
    } else if (arg === '--max-steps') {
      const val = parseInt(args[++i] || '', 10);
      if (isNaN(val) || val < 1) {
        console.error('Error: --max-steps requires a positive integer');
        process.exit(1);
      }
      maxStepsOverride = val;
    } else if (arg === '--provider' || arg === '-p') {
      providerOverride = args[++i];
    } else if (!arg.startsWith('-')) {
      prompt.push(arg);
    }
  }
  
  const config = await loadConfig();
  
  if (listModels) {
    const provider = providerOverride || config.provider || 'openrouter';
    if (provider === 'google') {
      await listGoogleModels();
    } else {
      await listOpenRouterModels();
    }
    process.exit(0);
  }
  
  if (prompt.length === 0) {
    console.error('Error: No prompt provided. Use --help for usage.');
    process.exit(1);
  }
  
  const provider = providerOverride || config.provider || 'openrouter';
  const modelName = modelOverride || config.model.name;
  const maxSteps = maxStepsOverride ?? config.maxSteps ?? 5;
  
  if (verbose || debug) {
    console.log(`Provider: ${provider}`);
    console.log(`Model: ${provider}/${modelName}`);
    console.log(`Tools: ${config.tools.enabled.join(', ')}`);
    console.log(`Max steps: ${maxSteps}`);
    console.log('---');
  }
  
  try {
    const model = provider === 'google' 
      ? google(modelName)
      : openrouter(modelName);

    const result = await generateText({
      model,
      prompt: prompt.join(' '),
      tools: { list_dir: listDir },
      stopWhen: stepCountIs(maxSteps),
    });
    
    console.log(result.text);
    
    if (debug) {
      console.log('\n' + '='.repeat(60));
      console.log('DEBUG: RAW PAYLOADS');
      console.log('='.repeat(60));
      
      result.steps.forEach((step, index) => {
        console.log(`\n--- STEP ${index + 1} ---`);
        
        if (step.request.body) {
          console.log('\n[REQUEST BODY]');
          console.log(JSON.stringify(step.request.body, null, 2));
        }
        
        if (step.response.headers) {
          console.log('\n[RESPONSE HEADERS]');
          console.log(JSON.stringify(step.response.headers, null, 2));
        }
        
        if (step.response.body) {
          console.log('\n[RESPONSE BODY]');
          console.log(JSON.stringify(step.response.body, null, 2));
        }
      });
      
      console.log('\n' + '='.repeat(60));
    }
    
    if (verbose) {
      console.log('\n---');
      console.log(`Finish reason: ${result.finishReason}`);
      console.log(`Steps: ${result.steps.length}`);
      
      if (result.usage) {
        console.log(`Input tokens: ${result.usage.inputTokens ?? 'N/A'}`);
        console.log(`Output tokens: ${result.usage.outputTokens ?? 'N/A'}`);
      }
      
      const toolCalls = result.steps.flatMap(s => s.toolCalls);
      if (toolCalls.length > 0) {
        console.log(`Tool calls: ${toolCalls.length}`);
        toolCalls.forEach(tc => {
          console.log(`  - ${tc.toolName}: ${JSON.stringify(tc.input)}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
