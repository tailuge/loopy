import React from 'react';
import { Box, Text, Static } from 'ink';
import { MessageItem } from './MessageItem.js';
import { ToolCallDisplay } from './ToolCallDisplay.js';
import type { Message } from '../llm/types.js';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  streamingModelId?: string;
  currentToolCall: { toolName: string; input: unknown } | null;
  currentToolResult: { toolName: string; result: unknown } | null;
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingText,
  streamingModelId,
  currentToolCall,
  currentToolResult,
  isLoading,
}) => {
  // Static messages (history that won't change)
  const staticMessages = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];
  
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Static history for better performance */}
      {staticMessages.length > 0 && (
        <Static items={staticMessages}>
          {(message, index) => (
            <MessageItem key={index} message={message} />
          )}
        </Static>
      )}
      
      {/* Last committed message */}
      {lastMessage && (
        <MessageItem message={lastMessage} />
      )}
      
      {/* Current tool call being executed */}
      {currentToolCall && (
        <ToolCallDisplay
          toolName={currentToolCall.toolName}
          input={currentToolCall.input}
          result={currentToolResult?.result}
          isComplete={currentToolResult !== null}
        />
      )}
      
      {/* Streaming text */}
      {streamingText && (
        <Box flexDirection="column">
          <Box>
            <Text bold color="green">Assistant{streamingModelId ? ` (${streamingModelId})` : ''}: </Text>
            <Text>{streamingText}</Text>
          </Box>
        </Box>
      )}
      
      {/* Loading indicator when no streaming text yet */}
      {isLoading && !streamingText && !currentToolCall && (
        <Box>
          <Text dimColor>Thinking...</Text>
        </Box>
      )}
    </Box>
  );
};
