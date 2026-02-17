import { tool } from 'ai';
import { z } from 'zod';
import { readdir } from 'fs/promises';

export const listDir = tool({
  description: 'List contents of a directory',
  inputSchema: z.object({
    path: z.string().describe('Directory path to list'),
  }),
  execute: async ({ path }) => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
      }));
    } catch (error) {
      return { error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
