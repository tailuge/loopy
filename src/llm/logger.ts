import { appendFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private logDir: string;
  private currentLogFile: string | null = null;
  private initialized = false;

  constructor() {
    this.logDir = join(homedir(), '.loopy', 'logs');
  }

  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.log`;
  }

  private async ensureLogDir(): Promise<void> {
    if (!this.initialized) {
      try {
        await mkdir(this.logDir, { recursive: true });
        this.initialized = true;
      } catch {
        // Directory might already exist
        this.initialized = true;
      }
    }
  }

  private formatEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}\n`;
  }

  private async write(level: LogLevel, message: string, data?: unknown): Promise<void> {
    try {
      await this.ensureLogDir();
      
      const logFile = this.getLogFileName();
      if (logFile !== this.currentLogFile) {
        this.currentLogFile = logFile;
      }

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      };

      const logPath = join(this.logDir, logFile);
      await appendFile(logPath, this.formatEntry(entry));
    } catch {
      // Silently fail logging to avoid disrupting the app
    }
  }

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.write('error', message, data);
  }
}

export const logger = new Logger();
