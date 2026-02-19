import { tool } from 'ai';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export const writeFileTool = tool({
  description: 'Write content to a file. This will create the file if it does not exist, and overwrite it if it does.',
  inputSchema: z.object({
    path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Content to write to the file'),
  }),
  execute: async ({ path, content }) => {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
