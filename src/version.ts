import { VERSION } from './version.gen.js';

export async function getVersion(): Promise<string> {
  return VERSION;
}

export function getVersionSync(): string {
  return VERSION;
}
