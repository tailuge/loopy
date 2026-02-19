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
      // Grep output format is typically filename:linenumber:content
      // We use a regex to capture the first two parts correctly even if filename has colons
      // although grep usually prefixes with ./ or similar.
      // A more robust way is to find the first colon, then the next colon which should be after a number.
      const match = line.match(/^(.*?):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNumber, content] = match;
        return { file, line: parseInt(lineNumber, 10), content: content.trim() };
      }
      return null;
    }).filter(Boolean);

    return { results };
  },
});
