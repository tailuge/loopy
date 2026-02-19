import { tool } from 'ai';
import { z } from 'zod';
import { readdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

export const grep = tool({
  description: 'Search for a pattern in files within a directory',
  inputSchema: z.object({
    pattern: z.string().describe('The regex pattern to search for'),
    path: z.string().describe('The directory to search in (defaults to current directory)').default('.'),
    recursive: z.boolean().describe('Whether to search recursively').default(true),
  }),
  execute: async ({ pattern, path, recursive }) => {
    try {
      const regex = new RegExp(pattern);
      const results: { file: string; line: number; content: string }[] = [];
      const MAX_RESULTS = 100;

      async function search(dir: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= MAX_RESULTS) break;

          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            if (recursive && entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== 'dist') {
              await search(fullPath);
            }
          } else {
            try {
              const fileStream = createReadStream(fullPath);
              const rl = createInterface({
                input: fileStream,
                crlfDelay: Infinity
              });

              let lineNumber = 0;
              for await (const line of rl) {
                lineNumber++;
                if (regex.test(line)) {
                  results.push({ file: fullPath, line: lineNumber, content: line.trim() });
                }
                if (results.length >= MAX_RESULTS) {
                  rl.close();
                  fileStream.destroy();
                  break;
                }
              }
            } catch (e) {
              // Skip files that cannot be read or are not text
            }
          }
        }
      }

      await search(path);
      return { results };
    } catch (error) {
      return { error: `Failed to grep: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
