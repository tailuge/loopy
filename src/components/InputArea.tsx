import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InputAreaProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  // Handle up/down arrow for history navigation
  useInput((_, key) => {
    if (isLoading) return;
    
    if (key.upArrow) {
      if (historyIndex === -1) {
        // Save current input before navigating
        setSavedInput(input);
      }
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      if (newIndex >= 0 && history.length > 0) {
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    }
    
    if (key.downArrow) {
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex - 1;
      if (newIndex === -1) {
        // Restore saved input
        setHistoryIndex(-1);
        setInput(savedInput);
      } else if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    }
  }, { isActive: !isLoading });

  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    // Add to history (avoid duplicates)
    if (history[history.length - 1] !== trimmed) {
      setHistory(prev => [...prev, trimmed]);
    }
    
    // Reset history navigation
    setHistoryIndex(-1);
    setSavedInput('');
    setInput('');
    
    onSubmit(trimmed);
  }, [history, onSubmit]);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text dimColor={isLoading}>
        {isLoading ? '⏳' : '>'}
      </Text>
      <Box marginLeft={1} flexGrow={1}>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={isLoading ? 'Waiting for response...' : 'Type a message or /help for commands'}
          showCursor={!isLoading}
        />
      </Box>
    </Box>
  );
};
