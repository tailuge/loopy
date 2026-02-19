import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { InputArea } from './InputArea.js';

describe('InputArea', () => {
  it('should render mode and prompt', () => {
    const { lastFrame } = render(
      <InputArea onSubmit={vi.fn()} isLoading={false} mode="chat" />
    );

    expect(lastFrame()).toContain('[chat]');
    expect(lastFrame()).toContain('>');
  });

  it('should show loading state', () => {
    const { lastFrame } = render(
      <InputArea onSubmit={vi.fn()} isLoading={true} mode="chat" />
    );

    expect(lastFrame()).toContain('⏳');
    expect(lastFrame()).toContain('Waiting for response...');
  });
});
