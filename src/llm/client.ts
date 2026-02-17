import { streamText, generateText, stepCountIs } from 'ai';
import type { Message, StreamEvent, LLMConfig } from './types.js';
import { logger } from './logger.js';
import { listDir } from '../tools/list-dir.js';

// Re-export providers
export { google } from '@ai-sdk/google';
export { createOpenRouter } from '@openrouter/ai-sdk-provider';
export { listDir };

export function createModel(provider: string, modelName: string) {
  if (provider === 'google') {
    const { google } = require('@ai-sdk/google');
    return google(modelName);
  }
  const { createOpenRouter } = require('@openrouter/ai-sdk-provider');
  const or = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return or(modelName);
}

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
    const result = streamText({
      model,
      messages,
      tools: config.tools,
      stopWhen: stepCountIs(config.maxSteps),
    });

    let fullText = '';

    for await (const part of result.fullStream) {
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
        logger.info('Stream finished', {
          finishReason: finishPart.finishReason,
          usage: finishPart.totalUsage,
        });
        yield {
          type: 'finish',
          finishReason: finishPart.finishReason,
          usage: {
            inputTokens: finishPart.totalUsage?.inputTokens,
            outputTokens: finishPart.totalUsage?.outputTokens,
          },
        };
      }
    }
  } catch (error) {
    logger.error('Stream error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function chat(
  messages: Message[],
  config: LLMConfig
): Promise<string> {
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

    return result.text;
  } catch (error) {
    logger.error('Chat error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Tools - use import and cast
export const tools: Record<string, unknown> = { list_dir: listDir };
