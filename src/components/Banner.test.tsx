import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { Banner } from './Banner.js';

// Mock getVersionSync
vi.mock('../version.js', () => ({
  getVersionSync: vi.fn().mockReturnValue('v1.2.3'),
  getVersion: vi.fn().mockResolvedValue('v1.2.3'),
}));

describe('Banner', () => {
  it('should render provider and model', () => {
    const { lastFrame } = render(
      <Banner provider="test-provider" model="test-model" />
    );

    const output = lastFrame();
    expect(output).toContain('Provider: test-provider');
    expect(output).toContain('Model: test-model');
  });

  it('should render version from getVersionSync', () => {
    const { lastFrame } = render(
      <Banner provider="test-provider" model="test-model" />
    );

    expect(lastFrame()).toContain('Version: v1.2.3');
  });

  it('should render help instruction', () => {
    const { lastFrame } = render(
      <Banner provider="test-provider" model="test-model" />
    );

    expect(lastFrame()).toContain('Type /help for commands');
  });
});
