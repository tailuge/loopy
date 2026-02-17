import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../llm/types.js';

interface MessageItemProps {
  message: Message;
  showRole?: boolean;
}

const roleColors: Record<Message['role'], string> = {
  user: 'cyan',
  assistant: 'green',
  system: 'yellow',
};

const roleLabels: Record<Message['role'], string> = {
  user: 'You',
  assistant: 'Assistant',
  system: 'System',
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, showRole = true }) => {
  const color = roleColors[message.role];
  const label = roleLabels[message.role];
  
  // Split content by newlines for proper rendering
  const lines = message.content.split('\n');
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      {lines.map((line, index) => (
        <Box key={index}>
          {index === 0 && showRole && (
            <Text bold color={color}>
              {label}:{' '}
            </Text>
          )}
          {index > 0 && showRole && (
            <Text>
              {' '.repeat(label.length + 2)}
            </Text>
          )}
          <Text wrap="wrap">{line || ' '}</Text>
        </Box>
      ))}
    </Box>
  );
};
