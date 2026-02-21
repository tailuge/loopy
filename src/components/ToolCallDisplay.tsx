import React from 'react';
import { Box, Text } from 'ink';

interface ToolCallDisplayProps {
  toolName: string;
  input?: unknown;
  result?: unknown;
  isComplete?: boolean;
  compact?: boolean;
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
  compact = false,
}) => {
  const inputStr = input ? truncateJSON(input, compact ? 30 : 50) : '';
  const resultStr = result ? truncateJSON(result, compact ? 100 : 200) : '';
  const showInput = input !== undefined && inputStr.length > 0;
  const showResult = isComplete && result !== undefined && resultStr.length > 0;
  
  if (compact) {
    return (
      <Box marginBottom={1}>
        <Text dimColor>[</Text>
        <Text color="magenta" bold>{toolName}</Text>
        {showInput && <Text dimColor> {inputStr.substring(0, 30)}{inputStr.length > 30 ? '...' : ''}</Text>}
        {showResult && <Text dimColor> → {resultStr.substring(0, 50)}{resultStr.length > 50 ? '...' : ''}</Text>}
        <Text dimColor>]</Text>
      </Box>
    );
  }
  
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
