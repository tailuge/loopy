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
      <Box flexDirection="column">
        <Text color="cyan"> _                            </Text>
        <Text color="cyan">| |    ___   ___  _ __  _   _ </Text>
        <Text color="cyan">| |   / _ \ / _ \| '_ \| | | |</Text>
        <Text color="cyan">| |__| (_) | (_) | |_) | |_| |</Text>
        <Text color="cyan">|_____\___/ \___/| .__/ \__, |</Text>
        <Text color="cyan">                 |_|    |___/ </Text>
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
