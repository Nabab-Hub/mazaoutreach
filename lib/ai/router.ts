import { AIProvider, AIProviderOptions } from './provider';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { GrokProvider } from './grok';
import { MockAIProvider } from './mock';
import { AITaskType, AIRouterConfig } from '../types';

class AIRouter {
  private providers: Record<string, AIProvider> = {
    gemini: new GeminiProvider(),
    openai: new OpenAIProvider(),
    grok: new GrokProvider(),
    mock: new MockAIProvider(),
  };

  private config: AIRouterConfig = {
    tasks: {
      personalize: { provider: 'gemini', model: 'gemini-1.5-flash' },
      classify: { provider: 'gemini', model: 'gemini-1.5-flash' },
      reply: { provider: 'openai', model: 'gpt-4o-mini' },
      niche_inference: { provider: 'gemini', model: 'gemini-1.5-flash' },
    },
    fallbacks: ['gemini', 'openai', 'grok'],
    temperature: 0.7,
  };

  getConfig(): AIRouterConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AIRouterConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      tasks: {
        ...this.config.tasks,
        ...(newConfig.tasks || {}),
      },
    };
  }

  getAvailableProviders(): Record<string, boolean> {
    return {
      gemini: this.providers.gemini.isAvailable(),
      openai: this.providers.openai.isAvailable(),
      grok: this.providers.grok.isAvailable(),
      mock: true,
    };
  }

  async generateForTask(
    task: AITaskType,
    opts: Omit<AIProviderOptions, 'model'> & { modelOverride?: string; providerOverride?: 'gemini' | 'openai' | 'grok' | 'mock' }
  ): Promise<{ text: string; provider: 'gemini' | 'openai' | 'grok' | 'mock'; model: string }> {
    const taskConfig = this.config.tasks[task] || { provider: 'gemini', model: 'gemini-1.5-flash' };
    const preferredProvider = opts.providerOverride || taskConfig.provider;
    const preferredModel = opts.modelOverride || taskConfig.model;

    // Check if DEMO mode is forced
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROK_API_KEY) {
      const mockResult = await this.providers.mock.generate({
        ...opts,
        model: 'demo-ai-engine',
        temperature: opts.temperature ?? this.config.temperature,
      });
      return { text: mockResult, provider: 'mock', model: 'demo-ai-engine' };
    }

    // Build the execution chain: Preferred -> Fallbacks -> Mock
    const chain: Array<'gemini' | 'openai' | 'grok' | 'mock'> = [];
    if (this.providers[preferredProvider]?.isAvailable()) {
      chain.push(preferredProvider);
    }

    for (const fb of this.config.fallbacks) {
      if (!chain.includes(fb) && this.providers[fb]?.isAvailable()) {
        chain.push(fb);
      }
    }

    // Always include mock as ultimate fallback if live providers fail or lack keys
    chain.push('mock');

    let lastError: Error | null = null;

    for (const providerKey of chain) {
      try {
        const provider = this.providers[providerKey];
        const modelToUse = providerKey === preferredProvider ? preferredModel : (providerKey === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
        
        const result = await provider.generate({
          ...opts,
          model: modelToUse,
          temperature: opts.temperature ?? this.config.temperature,
        });

        return {
          text: result,
          provider: providerKey,
          model: modelToUse,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIRouter] Provider ${providerKey} failed for task ${task}: ${err.message}. Trying next in chain...`);
      }
    }

    throw new Error(`All AI providers failed for task '${task}'. Last error: ${lastError?.message}`);
  }
}

export const aiRouter = new AIRouter();
