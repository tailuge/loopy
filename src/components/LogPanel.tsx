import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

interface LogPanelProps {
  visible: boolean;
}

export const LogPanel: React.FC<LogPanelProps> = ({ visible }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Load log file
  useEffect(() => {
    if (!visible) return;
    
    const loadLogs = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const logFile = `${year}-${month}-${day}.log`;
        const logPath = join(homedir(), '.loopy', 'logs', logFile);
        
        const content = await readFile(logPath, 'utf-8');
        const lines = content.trim().split('\n').slice(-100); // Last 100 lines
        setLogs(lines);
        setScrollOffset(0);
      } catch {
        setLogs(['No logs available for today.']);
      }
    };
    
    loadLogs();
    const interval = setInterval(loadLogs, 2000); // Refresh every 2 seconds
    
    return () => clearInterval(interval);
  }, [visible]);

  // Handle scrolling within log panel
  useInput((_, key) => {
    if (!visible) return;
    
    if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollOffset(prev => Math.min(logs.length - 10, prev + 1));
    }
  }, { isActive: visible });

  if (!visible) return null;

  const visibleLogs = logs.slice(scrollOffset, scrollOffset + 10);
  const maxScroll = Math.max(0, logs.length - 10);

  return (
    <Box 
      flexDirection="column" 
      borderStyle="double" 
      borderColor="yellow"
      padding={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text bold color="yellow">Log Panel</Text>
        <Text dimColor>(line {scrollOffset + 1}-{Math.min(scrollOffset + 10, logs.length)} of {logs.length})</Text>
      </Box>
      <Box flexDirection="column">
        {visibleLogs.map((log, index) => (
          <Text key={index} dimColor wrap="wrap">
            {log.length > 100 ? log.substring(0, 100) + '...' : log}
          </Text>
        ))}
      </Box>
      <Text dimColor>Use ↑/↓ to scroll, ` to close</Text>
    </Box>
  );
};
