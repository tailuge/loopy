import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { LogPanel } from './LogPanel.js';
import { waitFor } from '../test/utils.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('line1\nline2\nline3'),
}));

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn().mockReturnValue('/mock/home'),
}));

describe('LogPanel', () => {
  it('should not render when not visible', () => {
    const { lastFrame } = render(<LogPanel visible={false} />);
    expect(lastFrame()).toBe('');
  });

  it('should render when visible', async () => {
    const { lastFrame } = render(<LogPanel visible={true} />);

    // Wait for the mock data to appear
    await waitFor(() => lastFrame()?.includes('line1'), 2000);

    const output = lastFrame();
    expect(output).toContain('Log Panel');
    expect(output).toContain('line1');
    expect(output).toContain('line2');
    expect(output).toContain('line3');
  });

  it('should show message when logs are not available', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockRejectedValueOnce(new Error('File not found'));

    const { lastFrame } = render(<LogPanel visible={true} />);

    await waitFor(() => lastFrame()?.includes('No logs available for today.'), 2000);
  });
});
