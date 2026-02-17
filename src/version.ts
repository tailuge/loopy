import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedVersion: string = 'unknown';

export async function getVersion(): Promise<string> {
  if (cachedVersion !== 'unknown') {
    return cachedVersion;
  }

  // Try git describe first
  try {
    const version = execSync('git describe --tags --always --dirty 2>/dev/null', {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (version) {
      cachedVersion = version;
      return version;
    }
  } catch {
    // Git not available or not a git repo
  }

  // Fallback to package.json version
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    cachedVersion = pkg.version || 'unknown';
    return cachedVersion;
  } catch {
    return 'unknown';
  }
}

export function getVersionSync(): string {
  if (cachedVersion !== 'unknown') {
    return cachedVersion;
  }

  // Try git describe first
  try {
    const version = execSync('git describe --tags --always --dirty 2>/dev/null', {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (version) {
      cachedVersion = version;
      return version;
    }
  } catch {
    // Git not available or not a git repo
  }

  // Fallback - try to read package.json synchronously
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    cachedVersion = pkg.version || 'unknown';
    return cachedVersion;
  } catch {
    return 'unknown';
  }
}
