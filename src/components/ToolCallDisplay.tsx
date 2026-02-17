import React from 'react';
import { Box, Text } from 'ink';

interface ToolCallDisplayProps {
  toolName: string;
  input?: unknown;
  result?: unknown;
  isComplete?: boolean;
}

function truncateJSON(data: unknown, maxLength: number): string {
  try {
    const str = JSON.stringify(data, null, 2) || '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch {
    return String(data);
  }
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolName,
  input,
  result,
  isComplete = false,
}) => {
  const inputStr = input ? truncateJSON(input, 50) : '';
  const resultStr = result ? truncateJSON(result, 200) : '';
  const showInput = input !== undefined && inputStr.length > 0;
  const showResult = isComplete && result !== undefined && resultStr.length > 0;
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text dimColor>[Tool:</Text>
        <Text color="magenta" bold>{` ${toolName} `}</Text>
        <Text dimColor>]</Text>
        {showInput && (
          <Text dimColor>{` ${inputStr}`}</Text>
        )}
      </Box>
      {showResult && (
        <Box marginLeft={2}>
          <Text dimColor>{`→ ${resultStr}`}</Text>
        </Box>
      )}
    </Box>
  );
};
