import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function execCommand(command: string, timeout = 30000) {
  try {
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout
    });
    return { stdout, stderr };
  } catch (error) {
    return {
      error: `Failed to run command: ${error instanceof Error ? error.message : String(error)}`,
      stdout: (error as any).stdout,
      stderr: (error as any).stderr,
      code: (error as any).code
    };
  }
}

export const shell = tool({
  description: 'Run a shell command. The command will time out after 30 seconds.',
  inputSchema: z.object({
    command: z.string().describe('The command to run'),
  }),
  execute: async ({ command }) => {
    return await execCommand(command);
  },
});
