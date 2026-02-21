export interface ToolCallRecord {
  toolName: string;
  input: unknown;
  result?: unknown;
}

export interface StepContent {
  text: string;
  toolCalls: ToolCallRecord[];
}

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  steps?: StepContent[];
};

export type ToolCallEvent = {
  type: 'tool-call';
  toolName: string;
  input: unknown;
};

export type ToolResultEvent = {
  type: 'tool-result';
  toolName: string;
  result: unknown;
};

export type TextDeltaEvent = {
  type: 'text-delta';
  delta: string;
};

export type StepFinishEvent = {
  type: 'step-finish';
  stepNumber: number;
};

export type StepContentEvent = {
  type: 'step-content';
  stepNumber: number;
  content: StepContent;
};

export type FinishEvent = {
  type: 'finish';
  finishReason: string;
  modelId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type StreamEvent =
  | TextDeltaEvent
  | ToolCallEvent
  | ToolResultEvent
  | StepFinishEvent
  | StepContentEvent
  | FinishEvent;

// Use any for tools to avoid complex generic constraints with AI SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolsRecord = Record<string, any>;

export interface LLMConfig {
  provider: string;
  model: string;
  maxSteps: number;
  tools: ToolsRecord;
}
