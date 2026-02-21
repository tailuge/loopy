import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

export interface Mode {
  name: string;
  content: string;
  tools: string[];  // Tools enabled for this mode
}

/**
 * Tools available for each mode.
 * code: full access to all tools
 * plan: read-only access (no write_file, apply_diff, or shell)
 */
export const MODE_TOOLS: Record<string, string[]> = {
  code: ['list_dir', 'read_file', 'write_file', 'apply_diff', 'grep', 'shell'],
  plan: ['list_dir', 'read_file', 'grep'],  // Read-only mode
};

// Get the project root directory (where modes/ folder lives)
function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..');
}

// Built-in default mode content (fallback when file is missing)
const BUILTIN_DEFAULT = `You are a helpful AI assistant. Be concise and clear in your responses.`;

/**
 * Generate the _system_info.md file with current runtime context.
 * This file is included by modes via [[include:_system_info]]
 */
async function generateSystemInfo(cwd: string, modesDir: string): Promise<void> {
  const content = `## System Information

Operating System: ${process.platform}
Default Shell: ${process.env.SHELL || 'unknown'}
Current Working Directory: ${cwd}
Home Directory: ${homedir()}`;
  
  await writeFile(join(modesDir, '_system_info.md'), content, 'utf-8');
}

/**
 * List all available mode names from the modes/ directory.
 * Excludes files starting with underscore (private fragments).
 */
export async function listModes(): Promise<string[]> {
  try {
    const modesDir = join(getProjectRoot(), 'modes');
    const files = await readdir(modesDir);
    return files
      .filter(f => f.endsWith('.md') && !f.startsWith('_'))
      .map(f => f.replace('.md', ''))
      .sort();
  } catch {
    // If modes directory doesn't exist, return only code
    return ['code'];
  }
}

/**
 * Recursively process [[include:filename]] tags in mode files.
 */
async function processIncludes(content: string, modesDir: string, seen = new Set<string>()): Promise<string> {
  const includeRegex = /\[\[include:([^\]]+)\]\]/g;
  const matches = Array.from(content.matchAll(includeRegex));

  if (matches.length === 0) return content;

  let lastIndex = 0;
  const parts: string[] = [];

  for (const match of matches) {
    // Add text before the match
    parts.push(content.slice(lastIndex, match.index ?? lastIndex));

    const includeName = match[1];
    if (seen.has(includeName)) {
      parts.push(`[Error: Circular include detected for "${includeName}"]`);
    } else {
      try {
        const includePath = join(modesDir, `${includeName}.md`);
        let includeContent = await readFile(includePath, 'utf-8');

        // Strip the optional "# Mode: <name>" header from included fragments
        if (includeContent.startsWith('# Mode:')) {
          const lines = includeContent.split('\n');
          includeContent = lines.slice(1).join('\n').trim();
        }

        // Process nested includes
        const processed = await processIncludes(includeContent, modesDir, new Set([...seen, includeName]));
        parts.push(processed);
      } catch {
        parts.push(`[Error: Could not include mode fragment "${includeName}"]`);
      }
    }

    lastIndex = (match.index ?? 0) + match[0].length;
  }

  // Add remaining text
  parts.push(content.slice(lastIndex));
  return parts.join('');
}

/**
 * Load a mode by name from the modes/ directory.
 * Generates system info file before processing includes.
 * Falls back to built-in default if the mode file doesn't exist.
 */
export async function loadMode(name: string, cwd: string = process.cwd()): Promise<Mode> {
  try {
    const modesDir = join(getProjectRoot(), 'modes');
    
    // Generate system info before processing includes
    await generateSystemInfo(cwd, modesDir);
    
    const filePath = join(modesDir, `${name}.md`);
    let content = await readFile(filePath, 'utf-8');
    
    // Process includes first
    content = await processIncludes(content, modesDir);

    // Strip the optional "# Mode: <name>" header line
    const lines = content.split('\n');
    let startIndex = 0;
    if (lines[0]?.startsWith('# Mode:')) {
      startIndex = 1;
      // Skip empty line after header if present
      if (lines[1]?.trim() === '') {
        startIndex = 2;
      }
    }
    
    return {
      name,
      content: lines.slice(startIndex).join('\n').trim(),
      tools: MODE_TOOLS[name] ?? MODE_TOOLS.code,
    };
  } catch {
    // Fall back to built-in default
    return {
      name: 'code',
      content: BUILTIN_DEFAULT,
      tools: MODE_TOOLS.code,
    };
  }
}

/**
 * Get tools enabled for a specific mode.
 */
export function getToolsForMode(modeName: string): string[] {
  return MODE_TOOLS[modeName] ?? MODE_TOOLS.code;
}

/**
 * Get a mode by name, returns null if not found.
 */
export async function getMode(name: string, cwd: string = process.cwd()): Promise<Mode | null> {
  const modes = await listModes();
  if (!modes.includes(name)) {
    return null;
  }
  return loadMode(name, cwd);
}
