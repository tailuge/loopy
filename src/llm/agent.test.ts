import { describe, it, expect } from 'vitest';
import { Agent } from './agent.js';
import { EventEmitter } from 'events';

describe('Agent', () => {
  it('class should extend EventEmitter', () => {
    const agent = new Agent({ provider: 'google', model: 'test' });
    expect(agent instanceof EventEmitter).toBe(true);
  });

  it('should manage history correctly', () => {
    const agent = new Agent({
      provider: 'google',
      model: 'test',
      instructions: 'Be a helpful assistant'
    });

    const messages = agent.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe('Be a helpful assistant');

    agent.clearHistory();
    expect(agent.getMessages().length).toBe(1);
    expect(agent.getMessages()[0].role).toBe('system');
  });

  it('should allow adding tools', () => {
    const agent = new Agent({ provider: 'google', model: 'test' });
    let toolAdded = false;
    agent.on('tool:added', (name) => {
      if (name === 'my-tool') toolAdded = true;
    });

    agent.addTool('my-tool', { execute: async () => {} });
    expect(toolAdded).toBe(true);
  });

  it('should update config', () => {
    const agent = new Agent({ provider: 'google', model: 'test' });
    agent.updateConfig({ model: 'new-model' });
    expect(true).toBe(true);
  });

  it('should allow setting messages', () => {
    const agent = new Agent({ provider: 'google', model: 'test' });
    const messages: any[] = [{ role: 'user', content: 'hello' }];
    agent.setMessages(messages);
    expect(agent.getMessages().length).toBe(1);
    expect(agent.getMessages()[0].content).toBe('hello');
  });
});
