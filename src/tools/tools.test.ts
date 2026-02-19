import test from 'node:test';
import assert from 'node:assert';
import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { grep } from './grep.js';
import { shell } from './shell.js';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

test('read_file and write_file tools', async (t) => {
  const testDir = './test-output';
  await mkdir(testDir, { recursive: true });
  const testFile = join(testDir, 'test.txt');
  const content = 'hello world';

  await t.test('write_file should write a file', async () => {
    const result = await writeFileTool.execute!({ path: testFile, content }, {} as any);
    assert.deepStrictEqual(result, { success: true });
  });

  await t.test('read_file should read a file', async () => {
    const result = await readFileTool.execute!({ path: testFile }, {} as any);
    assert.deepStrictEqual(result, { content });
  });

  // Cleanup
  await rm(testDir, { recursive: true, force: true });
});

test('grep tool', async (t) => {
  const testDir = './test-grep';
  await mkdir(testDir, { recursive: true });
  await writeFileTool.execute!({ path: join(testDir, 'file1.txt'), content: 'apple\nbanana' }, {} as any);
  await writeFileTool.execute!({ path: join(testDir, 'file2.txt'), content: 'banana\ncherry' }, {} as any);

  await t.test('grep should find matches', async () => {
    const result: any = await grep.execute!({ pattern: 'banana', path: testDir, recursive: true }, {} as any);
    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results.some((r: any) => r.file.includes('file1.txt')));
    assert.ok(result.results.some((r: any) => r.file.includes('file2.txt')));
  });

  await t.test('grep should respect pattern', async () => {
    const result: any = await grep.execute!({ pattern: 'apple', path: testDir, recursive: true }, {} as any);
    assert.strictEqual(result.results.length, 1);
    assert.ok(result.results[0].file.includes('file1.txt'));
  });

  // Cleanup
  await rm(testDir, { recursive: true, force: true });
});

test('shell tool', async (t) => {
  await t.test('shell should execute echo', async () => {
    const result: any = await shell.execute!({ command: 'echo "hello"' }, {} as any);
    assert.strictEqual(result.stdout.trim(), 'hello');
  });
});
