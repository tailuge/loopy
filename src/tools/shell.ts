import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const shell = tool({
  description: 'Run a shell command',
  inputSchema: z.object({
    command: z.string().describe('The command to run'),
  }),
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execPromise(command, { maxBuffer: 10 * 1024 * 1024 });
      return { stdout, stderr };
    } catch (error) {
      return {
        error: `Failed to run command: ${error instanceof Error ? error.message : String(error)}`,
        stdout: (error as any).stdout,
        stderr: (error as any).stderr
      };
    }
  },
});
