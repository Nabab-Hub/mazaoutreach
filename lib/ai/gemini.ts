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

    const candidateModels = [
      opts.model,
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ].filter((m): m is string => Boolean(m && m.trim().length > 0))
     .filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
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
          lastError = new Error(`Gemini API error for model ${model} [${res.status}]: ${errText}`);
          // If rate limited or quota exhausted (429), throw immediately if daily quota is exceeded so router can use Grok
          if (res.status === 429) {
            if (errText.toLowerCase().includes('quota') || errText.includes('RESOURCE_EXHAUSTED')) {
              throw lastError;
            }
            continue;
          }
          if ([404, 503].includes(res.status)) {
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const textPart = candidate?.content?.parts?.[0]?.text;

        if (!textPart) {
          lastError = new Error(`Gemini API returned empty response for model ${model}`);
          continue;
        }

        return textPart.trim();
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.toLowerCase().includes('quota')) {
          console.warn(`[GeminiProvider] Quota exhausted for Gemini, fast-failing to next provider: ${err.message}`);
          break;
        }
        console.warn(`[GeminiProvider] Attempt with model ${model} failed, trying fallback:`, err.message || err);
      }
    }

    throw lastError || new Error('Gemini API all candidate models failed');
  }
}
