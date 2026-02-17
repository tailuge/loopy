import React from 'react';
import { Box, Text } from 'ink';
import { getVersionSync } from '../version.js';

interface BannerProps {
  provider: string;
  model: string;
}

export const Banner: React.FC<BannerProps> = ({ provider, model }) => {
  const version = getVersionSync();
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="cyan" bold>
          ╔══════════════════════════════════════════════╗
        </Text>
      </Box>
      <Box>
        <Text color="cyan" bold>
          ║{'  '.padEnd(44)}║
        </Text>
      </Box>
      <Box>
        <Text color="cyan" bold>
          ║
        </Text>
        <Text color="cyan" bold>
          {'  Loopy - AI CLI Assistant'.padEnd(44)}
        </Text>
        <Text color="cyan" bold>
          ║
        </Text>
      </Box>
      <Box>
        <Text color="cyan" bold>
          ║{'  '.padEnd(44)}║
        </Text>
      </Box>
      <Box>
        <Text color="cyan" bold>
          ╚══════════════════════════════════════════════╝
        </Text>
      </Box>
      <Box marginLeft={1}>
        <Text dimColor>Version: {version}</Text>
      </Box>
      <Box marginLeft={1}>
        <Text dimColor>Provider: {provider} | Model: {model}</Text>
      </Box>
      <Box marginLeft={1}>
        <Text dimColor>Type /help for commands</Text>
      </Box>
    </Box>
  );
};
