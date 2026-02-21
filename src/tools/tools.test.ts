import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { read_file } from './read-file.js';
import { write_file } from './write-file.js';
import { grep } from './grep.js';
import { shell } from './shell.js';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

describe('read_file and write_file tools', () => {
  const testDir = './test-output';
  const testFile = join(testDir, 'test.txt');
  const content = 'hello world';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('write_file should write a file', async () => {
    const result = await write_file.execute!({ path: testFile, content }, {} as any);
    expect(result).toEqual({ success: true });
  });

  it('read_file should read a file with line numbers', async () => {
    await write_file.execute!({ path: testFile, content }, {} as any);
    const result = await read_file.execute!({ path: testFile }, {} as any);
    // read_file now prepends line numbers
    expect(result).toEqual({ content: '1 | hello world\n' });
  });

  it('read_file should handle multi-line files', async () => {
    const multiLineContent = 'line one\nline two\nline three';
    await write_file.execute!({ path: testFile, content: multiLineContent }, {} as any);
    const result = await read_file.execute!({ path: testFile }, {} as any);
    expect(result).toEqual({ 
      content: '1 | line one\n2 | line two\n3 | line three\n' 
    });
  });

  it('read_file should handle empty files', async () => {
    await write_file.execute!({ path: testFile, content: '' }, {} as any);
    const result = await read_file.execute!({ path: testFile }, {} as any);
    expect(result).toEqual({ content: '' });
  });
});

describe('grep tool', () => {
  const testDir = './test-grep';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await write_file.execute!({ path: join(testDir, 'file1.txt'), content: 'apple\nbanana' }, {} as any);
    await write_file.execute!({ path: join(testDir, 'file2.txt'), content: 'banana\ncherry' }, {} as any);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('grep should find matches', async () => {
    const result: any = await grep.execute!({ pattern: 'banana', path: testDir, recursive: true }, {} as any);
    expect(result.results.length).toBe(2);
    expect(result.results.some((r: any) => r.file.includes('file1.txt'))).toBe(true);
    expect(result.results.some((r: any) => r.file.includes('file2.txt'))).toBe(true);
  });

  it('grep should respect pattern', async () => {
    const result: any = await grep.execute!({ pattern: 'apple', path: testDir, recursive: true }, {} as any);
    expect(result.results.length).toBe(1);
    expect(result.results[0].file.includes('file1.txt')).toBe(true);
  });
});

describe('shell tool', () => {
  it('shell should execute echo', async () => {
    const result: any = await shell.execute!({ command: 'echo "hello"' }, {} as any);
    expect(result.stdout.trim()).toBe('hello');
  });
});
