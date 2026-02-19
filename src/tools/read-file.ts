import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';

export const readFileTool = tool({
  description: 'Read the content of a file',
  inputSchema: z.object({
    path: z.string().describe('Path to the file to read'),
  }),
  execute: async ({ path }) => {
    try {
      const content = await readFile(path, 'utf-8');
      return { content };
    } catch (error) {
      return { error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
