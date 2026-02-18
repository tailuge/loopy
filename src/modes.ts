import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface Mode {
  name: string;
  content: string;
}

// Get the project root directory (where modes/ folder lives)
function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..');
}

// Built-in default mode content (fallback when file is missing)
const BUILTIN_DEFAULT = `You are a helpful AI assistant. Be concise and clear in your responses.`;

/**
 * List all available mode names from the modes/ directory.
 */
export async function listModes(): Promise<string[]> {
  try {
    const modesDir = join(getProjectRoot(), 'modes');
    const files = await readdir(modesDir);
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .sort();
  } catch {
    // If modes directory doesn't exist, return only default
    return ['default'];
  }
}

/**
 * Load a mode by name from the modes/ directory.
 * Falls back to built-in default if the mode file doesn't exist.
 */
export async function loadMode(name: string): Promise<Mode> {
  try {
    const modesDir = join(getProjectRoot(), 'modes');
    const filePath = join(modesDir, `${name}.md`);
    const content = await readFile(filePath, 'utf-8');
    
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
      content: lines.slice(startIndex).join('\n').trim()
    };
  } catch {
    // Fall back to built-in default
    return {
      name: 'default',
      content: BUILTIN_DEFAULT
    };
  }
}

/**
 * Get a mode by name, returns null if not found.
 */
export async function getMode(name: string): Promise<Mode | null> {
  const modes = await listModes();
  if (!modes.includes(name)) {
    return null;
  }
  return loadMode(name);
}
