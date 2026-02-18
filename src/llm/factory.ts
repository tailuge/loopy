import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * Unified model factory for creating AI models based on provider and name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createModel(provider: string, modelName: string): any {
  if (provider === 'google') {
    return google(modelName);
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  return openrouter(modelName);
}
