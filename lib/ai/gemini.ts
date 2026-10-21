import { AIProvider, AIProviderOptions } from './provider';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  private defaultModel = 'gemini-1.5-flash';

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
  }

  async generate(opts: AIProviderOptions): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    const model = opts.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: opts.prompt }],
        },
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
      },
    };

    if (opts.system) {
      requestBody.systemInstruction = {
        parts: [{ text: opts.system }],
      };
    }

    if (opts.json) {
      requestBody.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error('Gemini API returned empty response');
    }

    return textPart.trim();
  }
}
