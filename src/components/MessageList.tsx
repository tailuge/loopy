import React from 'react';
import { Box, Text, Static } from 'ink';
import { MessageItem } from './MessageItem.js';
import { ToolCallDisplay } from './ToolCallDisplay.js';
import type { Message, StepContent } from '../llm/types.js';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  streamingModelId?: string;
  currentToolCall: { toolName: string; input: unknown } | null;
  currentToolResult: { toolName: string; result: unknown } | null;
  isLoading: boolean;
  scrollOffset: number;
  stepHistory: StepContent[];
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingText,
  streamingModelId,
  currentToolCall,
  currentToolResult,
  isLoading,
  scrollOffset,
  stepHistory,
}) => {
  const staticMessages = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];
  
  return (
    <Box flexDirection="column" flexGrow={1}>
      {staticMessages.length > 0 && (
        <Static items={staticMessages}>
          {(message, index) => (
            <MessageItem key={index} message={message} />
          )}
        </Static>
      )}
      
      {lastMessage && (
        <MessageItem message={lastMessage} />
      )}
      
      {stepHistory.map((step, stepIndex) => (
        <Box key={stepIndex} flexDirection="column" marginBottom={1}>
          {step.toolCalls.map((tc, tcIndex) => (
            <ToolCallDisplay
              key={tcIndex}
              toolName={tc.toolName}
              input={tc.input}
              result={tc.result}
              isComplete={tc.result !== undefined}
              compact={true}
            />
          ))}
          {step.text && (
            <Box>
              <Text dimColor color="green">Step {stepIndex + 1}: </Text>
              <Text dimColor>{step.text.substring(0, 100)}{step.text.length > 100 ? '...' : ''}</Text>
            </Box>
          )}
        </Box>
      ))}
      
      {currentToolCall && (
        <ToolCallDisplay
          toolName={currentToolCall.toolName}
          input={currentToolCall.input}
          result={currentToolResult?.result}
          isComplete={currentToolResult !== null}
        />
      )}
      
      {streamingText && (
        <Box flexDirection="column">
          <Box>
            <Text bold color="green">Assistant{streamingModelId ? ` (${streamingModelId})` : ''}: </Text>
            <Text>{streamingText}</Text>
          </Box>
        </Box>
      )}
      
      {isLoading && !streamingText && !currentToolCall && (
        <Box>
          <Text dimColor>Thinking...</Text>
        </Box>
      )}
      
      {scrollOffset > 0 && (
        <Box>
          <Text dimColor>↑ Scrolled {scrollOffset} lines</Text>
        </Box>
      )}
    </Box>
  );
};
