import { EventEmitter } from 'events';
import { streamChat, chat } from './client.js';
import type { Message, LLMConfig, ToolsRecord } from './types.js';
import { logger } from './logger.js';

export interface AgentOptions {
  provider: string;
  model: string;
  maxSteps?: number;
  instructions?: string;
  tools?: ToolsRecord;
}

export interface SyncResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  finishReason?: string;
  modelId?: string;
  steps: any[];
}

/**
 * Event-driven Agent Core class.
 */
export class Agent extends EventEmitter {
  private messages: Message[] = [];
  private config: LLMConfig;
  private instructions: string | undefined;

  constructor(options: AgentOptions) {
    super();
    this.instructions = options.instructions;
    this.config = {
      provider: options.provider,
      model: options.model,
      maxSteps: options.maxSteps ?? 5,
      tools: options.tools ?? {},
    };

    if (this.instructions) {
      this.messages.push({ role: 'system', content: this.instructions });
    }
  }

  /**
   * Send a message and stream the response via events.
   */
  async send(content: string): Promise<void> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);

    try {
      let assistantText = '';
      let modelId: string | undefined;

      for await (const event of streamChat(this.messages, this.config)) {
        switch (event.type) {
          case 'text-delta':
            assistantText += event.delta;
            this.emit('stream:delta', event.delta);
            break;
          case 'tool-call':
            this.emit('tool:call', event.toolName, event.input);
            break;
          case 'tool-result':
            this.emit('tool:result', event.toolName, event.result);
            break;
          case 'finish':
            modelId = event.modelId;
            const assistantMessage: Message = { role: 'assistant', content: assistantText, modelId };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);
            this.emit('finish', event);
            break;
          case 'step-finish':
            break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      logger.error('Agent error', { error: errorMessage });
    }
  }

  /**
   * Send a message and wait for the full response.
   * Returns text and metadata.
   */
  async sendSync(content: string): Promise<SyncResponse> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);

    try {
      const result = await chat(this.messages, this.config);

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.text,
        modelId: result.modelId
      };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return {
        text: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
        modelId: result.modelId,
        steps: result.steps
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      logger.error('Agent sync error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get current conversation history.
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Set conversation history.
   */
  setMessages(messages: Message[]): void {
    this.messages = [...messages];
    this.emit('history:updated', this.messages);
  }

  /**
   * Clear conversation history (except instructions).
   */
  clearHistory(): void {
    this.messages = [];
    if (this.instructions) {
      this.messages.push({ role: 'system', content: this.instructions });
    }
    this.emit('history:cleared');
  }

  /**
   * Update system instructions and reset history.
   */
  setInstructions(text: string): void {
    this.instructions = text;
    this.clearHistory();
  }

  /**
   * Add a tool at runtime.
   */
  addTool(name: string, tool: any): void {
    this.config.tools[name] = tool;
    this.emit('tool:added', name);
  }

  /**
   * Update agent configuration.
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
