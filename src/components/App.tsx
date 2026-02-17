import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Banner } from './Banner.js';
import { MessageList } from './MessageList.js';
import { InputArea } from './InputArea.js';
import { LogPanel } from './LogPanel.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { streamChat, tools } from '../llm/client.js';
import { logger } from '../llm/logger.js';
import type { Message, LLMConfig } from '../llm/types.js';
import { loadEnv, loadConfig } from '../config.js';

interface AppProps {
  initialProvider?: string;
  initialModel?: string;
}

export const App: React.FC<AppProps> = ({ 
  initialProvider, 
  initialModel 
}) => {
  const { exit } = useApp();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingModelId, setStreamingModelId] = useState<string | undefined>();
  const [currentToolCall, setCurrentToolCall] = useState<{ toolName: string; input: unknown } | null>(null);
  const [currentToolResult, setCurrentToolResult] = useState<{ toolName: string; result: unknown } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [provider, setProvider] = useState(initialProvider || 'openrouter');
  const [model, setModel] = useState(initialModel || 'openai/gpt-4o-mini');
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Load config on mount
  useEffect(() => {
    const init = async () => {
      await loadEnv();
      const cfg = await loadConfig();
      const finalProvider = initialProvider || cfg.provider || 'openrouter';
      const finalModel = initialModel || cfg.model.name;
      setProvider(finalProvider);
      setModel(finalModel);
      setConfig({
        provider: finalProvider,
        model: finalModel,
        maxSteps: cfg.maxSteps ?? 5,
        tools: tools,
      });
      setConfigLoaded(true);
    };
    init();
  }, [initialProvider, initialModel]);

  // Toggle log panel with backtick
  useInput((input) => {
    if (input === '`') {
      setShowLog(prev => !prev);
    }
  });

  // Handle user input
  const handleSubmit = useCallback(async (input: string) => {
    if (!config) return;

    // Command context
    const commandContext: CommandContext = {
      messages,
      setMessages,
      provider,
      setProvider,
      model,
      setModel,
      showLog,
      setShowLog,
    };

    // First check if it's a command
    const result = await handleCommand(input, commandContext);
    
    if (result.type === 'exit') {
      exit();
      return;
    }
    
    if (result.type === 'output') {
      // Show output as system message
      setMessages(prev => [...prev, { role: 'system', content: result.content }]);
      return;
    }
    
    if (result.type !== 'message') {
      return;
    }
    
    const userMessage: Message = { role: 'user', content: result.content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingText('');
    setStreamingModelId(undefined);
    setCurrentToolCall(null);
    setCurrentToolResult(null);

    // Update config in case provider/model changed
    const currentConfig: LLMConfig = {
      ...config,
      provider,
      model,
    };

    logger.info('User message', { content: result.content, provider, model });

    try {
      let assistantText = '';
      
      for await (const event of streamChat(newMessages, currentConfig)) {
        if (event.type === 'text-delta') {
          assistantText += event.delta;
          setStreamingText(assistantText);
        } else if (event.type === 'tool-call') {
          setCurrentToolCall({ toolName: event.toolName, input: event.input });
          setCurrentToolResult(null);
        } else if (event.type === 'tool-result') {
          setCurrentToolResult({ toolName: event.toolName, result: event.result });
        } else if (event.type === 'finish') {
          // Add assistant message to history with modelId
          if (assistantText) {
            setMessages(prev => [...prev, { role: 'assistant', content: assistantText, modelId: event.modelId }]);
          }
          setStreamingModelId(event.modelId);
          setStreamingText('');
          setCurrentToolCall(null);
          setCurrentToolResult(null);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}` }]);
      logger.error('Chat error', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [messages, config, provider, model, showLog, exit]);

  if (!configLoaded) {
    return (
      <Box>
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Banner provider={provider} model={model} />
      
      <Box flexGrow={1} flexDirection="column">
        <MessageList
          messages={messages}
          streamingText={streamingText}
          streamingModelId={streamingModelId}
          currentToolCall={currentToolCall}
          currentToolResult={currentToolResult}
          isLoading={isLoading}
        />
      </Box>
      
      <LogPanel visible={showLog} />
      
      <InputArea onSubmit={handleSubmit} isLoading={isLoading} />
    </Box>
  );
};
