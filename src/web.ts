import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Bonjour } from 'bonjour-service';
import { logger } from './llm/logger.js';

const PORT = 8080;

export interface WebOptions {
  useMdns: boolean;
}

/**
 * Start the web interface via ttyd.
 * Returns a promise that resolves when ttyd exits.
 */
export function startWebInterface(options: WebOptions): Promise<number> {
  const { useMdns } = options;
  let bonjour: Bonjour | undefined;
  
  if (useMdns) {
    bonjour = new Bonjour();
    bonjour.publish({ name: 'loopy', type: 'http', port: PORT, host: 'loopy.local' });
    console.log(`Starting web interface on http://loopy.local:${PORT}`);
  } else {
    console.log(`Starting web interface on http://localhost:${PORT}`);
  }

  // Get path to custom index.html with viewport meta tag for mobile
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const htmlPath = join(__dirname, '..', 'html', 'index.html');

  // Spawn ttyd, telling it to run THIS same script but WITHOUT the --web flag
  const remainingArgs = process.argv.slice(2).filter(a => a !== '--web' && a !== '--mdns').join(' ');
  const nodePath = process.execPath;
  const cmd = `UI_MODE=mobile ${nodePath} ${process.argv[1]} ${remainingArgs}`.trim();
  const ttydCmd = `ttyd -p ${PORT} -i 0.0.0.0 --writable -I "${htmlPath}" -t fontSize=10 -t titleFixed=loopy sh -c "${cmd}"`;

  const ttyd = spawn('sh', ['-c', ttydCmd], { stdio: ['inherit', 'pipe', 'pipe'] });

  ttyd.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => logger.info('[ttyd]', line));
  });

  ttyd.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => logger.info('[ttyd]', line));
  });

  return new Promise((resolve) => {
    ttyd.on('exit', (code) => {
      bonjour?.destroy();
      resolve(code ?? 1);
    });
  });
}
