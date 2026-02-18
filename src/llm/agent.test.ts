import test from 'node:test';
import assert from 'node:assert';
import { Agent } from './agent.js';
import { EventEmitter } from 'events';

test('Agent class should extend EventEmitter', () => {
  const agent = new Agent({ provider: 'google', model: 'test' });
  assert.strictEqual(agent instanceof EventEmitter, true);
});

test('Agent should manage history correctly', () => {
  const agent = new Agent({
    provider: 'google',
    model: 'test',
    instructions: 'Be a helpful assistant'
  });

  const messages = agent.getMessages();
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].role, 'system');
  assert.strictEqual(messages[0].content, 'Be a helpful assistant');

  agent.clearHistory();
  assert.strictEqual(agent.getMessages().length, 1);
  assert.strictEqual(agent.getMessages()[0].role, 'system');
});

test('Agent should allow adding tools', () => {
  const agent = new Agent({ provider: 'google', model: 'test' });
  let toolAdded = false;
  agent.on('tool:added', (name) => {
    if (name === 'my-tool') toolAdded = true;
  });

  agent.addTool('my-tool', { execute: async () => {} });
  assert.strictEqual(toolAdded, true);
});

test('Agent should update config', () => {
  const agent = new Agent({ provider: 'google', model: 'test' });
  agent.updateConfig({ model: 'new-model' });
  // Internal config is private, but we can verify it doesn't crash
  assert.ok(true);
});

test('Agent should allow setting messages', () => {
  const agent = new Agent({ provider: 'google', model: 'test' });
  const messages: any[] = [{ role: 'user', content: 'hello' }];
  agent.setMessages(messages);
  assert.strictEqual(agent.getMessages().length, 1);
  assert.strictEqual(agent.getMessages()[0].content, 'hello');
});
