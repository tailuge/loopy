import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';

export const read_file = tool({
  description: 'Read the content of a file with line numbers prepended for use with apply_diff',
  inputSchema: z.object({
    path: z.string().describe('Path to the file to read'),
  }),
  execute: async ({ path }) => {
    try {
      const content = await readFile(path, 'utf-8');
      
      if (content === '') {
        return { content: '' };
      }
      
      let lines = content.split('\n');
      
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines = lines.slice(0, -1);
      }
      
      if (lines.length === 0) {
        return { content: '' };
      }
      
      const maxLineNum = lines.length;
      const width = String(maxLineNum).length;
      
      const numberedLines = lines.map((line, index) => {
        const lineNum = String(index + 1).padStart(width, ' ');
        return `${lineNum} | ${line}`;
      });
      
      return { content: numberedLines.join('\n') + '\n' };
    } catch (error) {
      return { error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
