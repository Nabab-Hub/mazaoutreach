export interface AIProviderOptions {
  system: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  model?: string;
}

export interface AIProvider {
  name: 'gemini' | 'openai' | 'grok' | 'mock';
  generate(opts: AIProviderOptions): Promise<string>;
  isAvailable(): boolean;
}
