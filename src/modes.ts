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
    // If modes directory doesn't exist, return only default
    return ['default'];
  }
}

/**
 * Recursively process [[include:filename]] tags in mode files.
 */
async function processIncludes(content: string, modesDir: string, seen = new Set<string>()): Promise<string> {
  const includeRegex = /\[\[include:([^\]]+)\]\]/g;
  let result = content;
  let match;

  // Re-run the regex against the updated result to handle nested/multiple includes
  // We use a copy of the regex to avoid state issues with lastIndex
  while ((match = /\[\[include:([^\]]+)\]\]/g.exec(result)) !== null) {
    const fullTag = match[0];
    const includeName = match[1];

    if (seen.has(includeName)) {
      result = result.replace(fullTag, `[Error: Circular include detected for "${includeName}"]`);
      continue;
    }

    try {
      const includePath = join(modesDir, `${includeName}.md`);
      let includeContent = await readFile(includePath, 'utf-8');

      // Strip the optional "# Mode: <name>" header from included fragments too
      if (includeContent.startsWith('# Mode:')) {
        includeContent = includeContent.split('\n').slice(1).join('\n').trim();
      }

      const processed = await processIncludes(includeContent, modesDir, new Set([...seen, includeName]));
      result = result.replace(fullTag, processed);
    } catch {
      result = result.replace(fullTag, `[Error: Could not include mode fragment "${includeName}"]`);
    }
  }

  return result;
}

/**
 * Load a mode by name from the modes/ directory.
 * Falls back to built-in default if the mode file doesn't exist.
 */
export async function loadMode(name: string): Promise<Mode> {
  try {
    const modesDir = join(getProjectRoot(), 'modes');
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
