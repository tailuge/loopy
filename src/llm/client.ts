import { streamText, generateText, stepCountIs } from 'ai';
import { createModel } from './factory.js';
import type { Message, StreamEvent, LLMConfig } from './types.js';
import { logger } from './logger.js';
import { listDir } from '../tools/list-dir.js';

export { listDir };

export async function* streamChat(
  messages: Message[],
  config: LLMConfig
): AsyncGenerator<StreamEvent> {
  const model = createModel(config.provider, config.model);
  
  logger.debug('Starting streamChat', {
    provider: config.provider,
    model: config.model,
    messageCount: messages.length,
  });

  try {
    const streamResult = streamText({
      model,
      messages,
      tools: config.tools,
      stopWhen: stepCountIs(config.maxSteps),
    });

    let fullText = '';
    let finishData: { finishReason: string; usage?: { inputTokens?: number; outputTokens?: number } } | null = null;

    for await (const part of streamResult.fullStream) {
      if (part.type === 'text-delta') {
        fullText += part.text;
        yield { type: 'text-delta', delta: part.text };
      } else if (part.type === 'tool-call') {
        const input = (part as { input?: unknown }).input;
        logger.info('Tool call', { toolName: part.toolName, input });
        yield { type: 'tool-call', toolName: part.toolName, input };
      } else if (part.type === 'tool-result') {
        const resultData = (part as { output?: unknown }).output;
        logger.debug('Tool result', { toolName: part.toolName, result: resultData });
        yield { type: 'tool-result', toolName: part.toolName, result: resultData };
      } else if (part.type === 'finish') {
        const finishPart = part as { finishReason: string; totalUsage?: { inputTokens?: number; outputTokens?: number } };
        finishData = {
          finishReason: finishPart.finishReason,
          usage: {
            inputTokens: finishPart.totalUsage?.inputTokens,
            outputTokens: finishPart.totalUsage?.outputTokens,
          },
        };
      }
    }

    const resolved = await streamResult;
    const modelId = (await resolved.response)?.modelId;

    if (finishData) {
      logger.info('Stream finished', {
        finishReason: finishData.finishReason,
        modelId,
        usage: finishData.usage,
      });
      yield {
        type: 'finish',
        finishReason: finishData.finishReason,
        modelId,
        usage: finishData.usage,
      };
    }
  } catch (error) {
    logger.error('Stream error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export interface ChatResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  finishReason: string;
  modelId?: string;
  steps: any[];
}

export async function chat(
  messages: Message[],
  config: LLMConfig
): Promise<ChatResult> {
  const model = createModel(config.provider, config.model);
  
  logger.debug('Starting chat', {
    provider: config.provider,
    model: config.model,
    messageCount: messages.length,
  });

  try {
    const result = await generateText({
      model,
      messages,
      tools: config.tools,
      stopWhen: stepCountIs(config.maxSteps),
    });

    logger.info('Chat finished', {
      finishReason: result.finishReason,
      usage: result.usage,
    });

    return {
      text: result.text,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
      finishReason: result.finishReason,
      modelId: result.response?.modelId,
      steps: result.steps,
    };
  } catch (error) {
    logger.error('Chat error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Tools - use import and cast
export const tools: Record<string, unknown> = { list_dir: listDir };
