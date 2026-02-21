import { tool } from 'ai';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';

interface DiffBlock {
  startLine: number;
  search: string;
  replace: string;
}

function parseDiffBlocks(diff: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const regex = /<<<<<<< SEARCH\r?\n:start_line:(\d+)\r?\n-------\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;
  
  let match;
  while ((match = regex.exec(diff)) !== null) {
    const startLine = parseInt(match[1], 10);
    const search = match[2];
    const replace = match[3];
    blocks.push({ startLine, search, replace });
  }
  
  return blocks;
}

function applySearchReplace(content: string, block: DiffBlock): string {
  const lines = content.split('\n');
  const startIndex = block.startLine - 1;
  
  const searchLines = block.search.split('\n');
  const contentSlice = lines.slice(startIndex, startIndex + searchLines.length).join('\n');
  
  if (contentSlice !== block.search) {
    const actualContent = contentSlice || '(content not found at line)';
    const expectedContent = block.search || '(empty search)';
    throw new Error(
      `Search content does not match at line ${block.startLine}.\n` +
      `Expected:\n${expectedContent}\n\n` +
      `Actual:\n${actualContent}`
    );
  }
  
  const replaceLines = block.replace.split('\n');
  const newLines = [
    ...lines.slice(0, startIndex),
    ...replaceLines,
    ...lines.slice(startIndex + searchLines.length)
  ];
  
  return newLines.join('\n');
}

export const applyDiff = tool({
  description: 'Apply precise, targeted modifications to an existing file using one or more search/replace blocks. The SEARCH block must exactly match the existing content, including whitespace and indentation. Use the read_file tool first if you are not confident in the exact content to search for.',
  inputSchema: z.object({
    path: z.string().describe('The absolute path to the file to modify'),
    diff: z.string().describe(`The diff content containing SEARCH/REPLACE blocks. Format:
<<<<<<< SEARCH
:start_line:<line_number>
-------
[exact content to find]
=======
[new content to replace with]
>>>>>>> REPLACE

Multiple blocks can be included in a single diff. The :start_line: is 1-based and indicates where the search content should be found.`),
  }),
  execute: async ({ path, diff }) => {
    try {
      const blocks = parseDiffBlocks(diff);
      
      if (blocks.length === 0) {
        return { error: 'No valid SEARCH/REPLACE blocks found in diff. Ensure the format is correct.' };
      }
      
      let content: string;
      try {
        content = await readFile(path, 'utf-8');
      } catch {
        return { error: `Failed to read file: ${path}. Ensure the file exists.` };
      }
      
      for (let i = 0; i < blocks.length; i++) {
        try {
          content = applySearchReplace(content, blocks[i]);
        } catch (e) {
          const err = e as Error;
          return { error: `Block ${i + 1} failed: ${err.message}` };
        }
      }
      
      try {
        await writeFile(path, content, 'utf-8');
      } catch {
        return { error: `Failed to write file: ${path}` };
      }
      
      return { success: true, appliedBlocks: blocks.length };
    } catch (e) {
      const err = e as Error;
      return { error: `Unexpected error: ${err.message}` };
    }
  },
});