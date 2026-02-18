import type { Message } from '../llm/types.js';
import { listGoogleModels, listOpenRouterModels } from './list-models.js';

export interface CommandContext {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  showLog: boolean;
  setShowLog: (show: boolean) => void;
  mode: string;
  setMode: (mode: string) => void;
  modes: string[];
}

export type CommandResult = 
  | { type: 'continue' }
  | { type: 'exit' }
  | { type: 'message'; content: string }
  | { type: 'output'; content: string };

export type CommandHandler = (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;

const HELP_TEXT = `
Available commands:
  /exit, /quit, /q    Exit the TUI
  /help, /?           Show this help message
  /list-models        List available models from current provider
  /model <name>       Switch to a different model
  /provider <name>    Switch provider (google or openrouter)
  /mode <name>        Switch mode (system prompt)
  /modes              List available modes
  /clear              Clear conversation history
  /log                Toggle log panel

Tips:
  - Use ↑/↓ arrows to navigate command history
  - Select text with mouse to copy (terminal handles this)
  - Press \` (backtick) to toggle log panel
  - Press TAB to cycle through modes
`;

export const commands: Record<string, CommandHandler> = {
  '/exit': () => ({ type: 'exit' }),
  '/quit': () => ({ type: 'exit' }),
  '/q': () => ({ type: 'exit' }),
  
  '/help': () => ({ type: 'output', content: HELP_TEXT }),
  '/?': () => ({ type: 'output', content: HELP_TEXT }),
  
  '/list-models': async (_, context) => {
    const models = context.provider === 'google' 
      ? await listGoogleModels()
      : await listOpenRouterModels();
    return { type: 'output', content: models };
  },
  
  '/model': (args, context) => {
    if (args.length === 0) {
      return { type: 'output', content: `Current model: ${context.model}\nUsage: /model <model-name>` };
    }
    const newModel = args.join(' ');
    context.setModel(newModel);
    return { type: 'output', content: `Model switched to: ${newModel}` };
  },
  
  '/provider': (args, context) => {
    if (args.length === 0) {
      return { type: 'output', content: `Current provider: ${context.provider}\nUsage: /provider <google|openrouter>` };
    }
    const newProvider = args[0].toLowerCase();
    if (newProvider !== 'google' && newProvider !== 'openrouter') {
      return { type: 'output', content: `Invalid provider: ${newProvider}. Use 'google' or 'openrouter'.` };
    }
    context.setProvider(newProvider);
    return { type: 'output', content: `Provider switched to: ${newProvider}` };
  },
  
  '/mode': (args, context) => {
    if (args.length === 0) {
      return { type: 'output', content: `Current mode: ${context.mode}\nAvailable: ${context.modes.join(', ')}\nUsage: /mode <name>` };
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
  
  '/clear': (_, context) => {
    context.setMessages([]);
    return { type: 'output', content: 'Conversation cleared.' };
  },
  
  '/log': (_, context) => {
    context.setShowLog(!context.showLog);
    return { type: 'output', content: context.showLog ? 'Log panel hidden.' : 'Log panel shown.' };
  },
};

export function parseCommand(input: string): { command: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }
  
  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  return { command, args };
}

export async function handleCommand(
  input: string,
  context: CommandContext
): Promise<CommandResult> {
  const parsed = parseCommand(input);
  
  if (!parsed) {
    return { type: 'message', content: input };
  }
  
  const { command, args } = parsed;
  const handler = commands[command];
  
  if (!handler) {
    return { 
      type: 'output', 
      content: `Unknown command: ${command}. Type /help for available commands.` 
    };
  }
  
  return handler(args, context);
}