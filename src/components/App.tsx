import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Banner } from './Banner.js';
import { MessageList } from './MessageList.js';
import { InputArea } from './InputArea.js';
import { LogPanel } from './LogPanel.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { tools } from '../llm/client.js';
import { logger } from '../llm/logger.js';
import type { Message, LLMConfig } from '../llm/types.js';
import { loadEnv, loadConfig } from '../config.js';
import { Agent } from '../llm/agent.js';
import { listModes, loadMode } from '../modes.js';

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
  const [model, setModel] = useState(initialModel || 'openrouter/auto');
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [mode, setMode] = useState('default');
  const [modes, setModes] = useState<string[]>([]);
  
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
      
      // Load available modes
      const availableModes = await listModes();
      setModes(availableModes);
      
      // Load default mode
      const defaultMode = await loadMode(cfg.defaultMode || 'default');
      setMode(defaultMode.name);
      
      setConfigLoaded(true);
    };
    init();
  }, [initialProvider, initialModel]);

  // Agent instance
  const agent = useMemo(() => {
    if (!configLoaded || !config) return null;
    return new Agent({
      provider,
      model,
      maxSteps: config.maxSteps,
      tools: config.tools,
    });
  }, [configLoaded]);

  // Update agent config when provider/model changes
  useEffect(() => {
    if (agent) {
      agent.updateConfig({ provider, model });
    }
  }, [agent, provider, model]);

  // Set agent instructions when mode changes
  useEffect(() => {
    const loadModeContent = async () => {
      if (!agent) return;
      const modeData = await loadMode(mode);
      agent.setInstructions(modeData.content);
    };
    loadModeContent();
  }, [agent, mode]);

  // Toggle log panel with backtick
  useInput((input) => {
    if (input === '`') {
      setShowLog(prev => !prev);
    }
  });

  // TAB to cycle modes
  useInput((input, key) => {
    if (key.tab && !isLoading && modes.length > 0) {
      const currentIndex = modes.indexOf(mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setMode(modes[nextIndex]);
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
      mode,
      setMode,
      modes,
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

    if (!agent) return;

    // Sync agent history with UI history
    agent.setMessages(messages);

    let assistantText = '';

    const onDelta = (delta: string) => {
      assistantText += delta;
      setStreamingText(assistantText);
    };

    const onToolCall = (name: string, input: unknown) => {
      setCurrentToolCall({ toolName: name, input });
      setCurrentToolResult(null);
    };

    const onToolResult = (name: string, result: unknown) => {
      setCurrentToolResult({ toolName: name, result });
    };

    const onFinish = (event: any) => {
      if (assistantText) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantText, modelId: event.modelId }]);
      }
      setStreamingModelId(event.modelId);
      cleanup();
    };

    const onError = (error: any) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}` }]);
      cleanup();
    };

    const cleanup = () => {
      agent.off('stream:delta', onDelta);
      agent.off('tool:call', onToolCall);
      agent.off('tool:result', onToolResult);
      agent.off('finish', onFinish);
      agent.off('error', onError);
      setIsLoading(false);
      setStreamingText('');
      setCurrentToolCall(null);
      setCurrentToolResult(null);
    };

    agent.on('stream:delta', onDelta);
    agent.on('tool:call', onToolCall);
    agent.on('tool:result', onToolResult);
    agent.on('finish', onFinish);
    agent.on('error', onError);

    agent.send(result.content);

  }, [messages, config, provider, model, showLog, exit, agent, mode, modes]);

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
      
      <InputArea onSubmit={handleSubmit} isLoading={isLoading} mode={mode} />
    </Box>
  );
};
