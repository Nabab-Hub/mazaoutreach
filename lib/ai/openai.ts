import { AIProvider, AIProviderOptions } from './provider';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;
  private defaultModel = 'gpt-4o-mini';

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
  }

  async generate(opts: AIProviderOptions): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment');
    }

    const model = opts.model || this.defaultModel;
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (opts.system) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: opts.prompt });

    const requestBody: any = {
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
    };

    if (opts.json) {
      requestBody.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message?.content;

    if (!message) {
      throw new Error('OpenAI API returned empty response');
    }

    return message.trim();
  }
}
