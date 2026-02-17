import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEnv(): Promise<void> {
  const envPath = join(__dirname, '..', '.env.local');
  try {
    const content = await readFile(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  } catch {
    // .env.local doesn't exist, that's ok
  }
}

export interface Config {
  provider?: string;
  model: { name: string };
  tools: { enabled: string[] };
  maxSteps?: number;
}

export async function loadConfig(): Promise<Config> {
  const configPath = join(__dirname, '..', 'config', 'default.json');
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      model: { name: 'gemini-2.5-flash' },
      tools: { enabled: ['list_dir'] },
      maxSteps: 5,
    };
  }
}
