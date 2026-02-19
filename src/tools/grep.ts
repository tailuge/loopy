import { tool } from 'ai';
import { z } from 'zod';
import { execCommand } from './shell.js';

export const grep = tool({
  description: 'Search for a pattern in files within a directory using the system grep command',
  inputSchema: z.object({
    pattern: z.string().describe('The pattern to search for (regex supported)'),
    path: z.string().describe('The directory to search in').default('.'),
    recursive: z.boolean().describe('Whether to search recursively').default(true),
  }),
  execute: async ({ pattern, path, recursive }) => {
    // Escape pattern and path for shell
    const escapedPattern = pattern.replace(/"/g, '\\"');
    const escapedPath = path.replace(/"/g, '\\"');

    // -r: recursive
    // -n: line number
    // -I: ignore binary files
    // -E: extended regex
    const flags = recursive ? '-rnIE' : '-nIE';
    const command = `grep ${flags} "${escapedPattern}" "${escapedPath}" | head -n 100`;

    const result = await execCommand(command);

    // grep returns exit code 1 if no matches are found
    if ('error' in result && (result as any).code !== 1) {
      return result;
    }

    if ((result as any).code === 1 || !result.stdout) {
      return { results: [], message: 'No matches found.' };
    }

    const lines = result.stdout.trim().split('\n');
    const results = lines.map((line: string) => {
      const parts = line.split(':');
      if (parts.length >= 3) {
        const file = parts[0];
        const lineNumber = parseInt(parts[1], 10);
        const content = parts.slice(2).join(':').trim();
        return { file, line: lineNumber, content };
      }
      return null;
    }).filter(Boolean);

    return { results };
  },
});
