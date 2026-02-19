import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { MessageItem } from './MessageItem.js';
import type { Message } from '../llm/types.js';

describe('MessageItem', () => {
  it('should render user message', () => {
    const message: Message = { role: 'user', content: 'Hello assistant' };
    const { lastFrame } = render(<MessageItem message={message} />);

    expect(lastFrame()).toContain('You: Hello assistant');
  });

  it('should render assistant message', () => {
    const message: Message = { role: 'assistant', content: 'Hello user' };
    const { lastFrame } = render(<MessageItem message={message} />);

    expect(lastFrame()).toContain('Assistant: Hello user');
  });

  it('should render assistant message with model ID', () => {
    const message: Message = {
      role: 'assistant',
      content: 'Hello user',
      modelId: 'gpt-4'
    };
    const { lastFrame } = render(<MessageItem message={message} />);

    expect(lastFrame()).toContain('Assistant (gpt-4): Hello user');
  });

  it('should render system message', () => {
    const message: Message = { role: 'system', content: 'System prompt' };
    const { lastFrame } = render(<MessageItem message={message} />);

    expect(lastFrame()).toContain('System: System prompt');
  });

  it('should not render role label when showRole is false', () => {
    const message: Message = { role: 'user', content: 'Hello' };
    const { lastFrame } = render(<MessageItem message={message} showRole={false} />);

    expect(lastFrame()).not.toContain('You:');
    expect(lastFrame()).toContain('Hello');
  });

  it('should handle multi-line content', () => {
    const message: Message = { role: 'user', content: 'Line 1\nLine 2' };
    const { lastFrame } = render(<MessageItem message={message} />);

    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
  });
});
