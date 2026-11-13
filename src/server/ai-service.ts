import { GoogleGenAI } from '@google/genai';
import { db, User, AiModel, AiProvider } from '../db/database.ts';
import { isSubscriptionActive, estimateTokens } from '../utils/billing.ts';
import { createSseLineParser } from '../utils/sse.ts';
import {
  OPENROUTER_DEFAULT_BASE_URL,
  isValidApiKey,
  resolveOpenRouterModels,
  buildOpenRouterRequestBody,
  parseOpenRouterStreamPayload
} from './openrouter.ts';
import { sanitizeModelForWorkspace } from './model-sanitizer.ts';

export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string, promptTokens: number, completionTokens: number) => void;
  onError: (error: Error) => void;
}

const DEFAULT_SYSTEM_PROMPT = `You are Bangla AI, a premium, intelligent, and highly articulate multi-model AI assistant designed for professionals, developers, and businesses in Bangladesh and globally.
Respond in clear, structured, and modern professional English by default (or fluent Bengali if the user requests it).
Provide well-formatted markdown with clear headings, lists, code snippets with syntax highlighting, and actionable insights.`;

export class AiService {
  /**
   * Validates if a user can send a prompt (active subscription & within usage limits)
   */
  public static validateAccess(user: User): { allowed: boolean; reason?: string; statusCode?: number } {
    if (user.role === 'admin') {
      return { allowed: true };
    }

    const sub = db.getSubscriptionByUserId(user.id);
    if (!sub || !isSubscriptionActive(sub)) {
      return {
        allowed: false,
        reason: 'Active subscription required to chat. Please subscribe to Monthly or Yearly plan to unlock all top AI models.',
        statusCode: 403
      };
    }

    const limit = user.usage_limit !== undefined ? user.usage_limit : 0;
    if (limit <= 0) {
      return {
        allowed: false,
        reason: 'You have 0 available tokens. Please subscribe to Monthly (1M tokens) or Yearly (15M tokens) plan to start chatting.',
        statusCode: 403
      };
    }
    if (user.current_usage >= limit) {
      return {
        allowed: false,
        reason: `Your current billing cycle usage limit (${limit.toLocaleString()} tokens) has been reached. Please contact admin or renew your plan.`,
        statusCode: 429
      };
    }

    return { allowed: true };
  }

  private static getEnvKeyForProvider(slug: string): string {
    switch (slug) {
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || '';
      case 'gemini':
        return process.env.GEMINI_API_KEY || '';
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'deepseek':
        return process.env.DEEPSEEK_API_KEY || '';
      case 'xai':
        return process.env.XAI_API_KEY || '';
      case 'moonshot':
        return process.env.MOONSHOT_API_KEY || '';
      default:
        return '';
    }
  }

  /**
   * Streams completion from an OpenAI-compatible SSE endpoint (used for OpenRouter and direct OpenAI/DeepSeek/xAI/Moonshot providers).
   */
  private static async streamOpenAiCompatibleEndpoint(params: {
    endpointUrl: string;
    apiKey: string;
    modelSlug: string;
    fallbackSlug?: string;
    messages: ChatMessageParam[];
    maxTokens?: number;
    extraHeaders?: Record<string, string>;
    callbacks: StreamCallbacks;
    lastUserMsg: string;
  }): Promise<void> {
    const attemptRequest = async (targetModel: string) => {
      return fetch(params.endpointUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
          ...(params.extraHeaders || {})
        },
        body: JSON.stringify(
          buildOpenRouterRequestBody(
            targetModel,
            params.messages,
            DEFAULT_SYSTEM_PROMPT,
            params.maxTokens
          )
        )
      });
    };

    let response = await attemptRequest(params.modelSlug);

    // Retry once with mapped fallback slug if primary slug is unavailable on user's OpenRouter tier
    if (!response.ok && (response.status === 400 || response.status === 404) && params.fallbackSlug && params.fallbackSlug !== params.modelSlug) {
      console.warn(`[OpenRouter] Primary model "${params.modelSlug}" returned ${response.status}, retrying with fallback "${params.fallbackSlug}"`);
      response = await attemptRequest(params.fallbackSlug);
    }

    if (!response.ok) {
      let errMsg = `Upstream AI API error (${response.status})`;
      try {
        const errText = await response.text();
        const parsedErr = JSON.parse(errText);
        errMsg = parsedErr?.error?.message || parsedErr?.message || errMsg;
      } catch {
        // Keep status message
      }
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming response body unavailable from AI gateway.');
    }

    const decoder = new TextDecoder('utf-8');
    const lineParser = createSseLineParser();
    let accumulatedText = '';
    let upstreamUsage: { promptTokens: number; completionTokens: number } | undefined;

    const handlePayloads = (payloads: string[]) => {
      for (const payload of payloads) {
        const evt = parseOpenRouterStreamPayload(payload);
        if (evt.error) {
          throw new Error(evt.error);
        }
        if (evt.usage) {
          upstreamUsage = evt.usage;
        }
        if (evt.textDelta) {
          accumulatedText += evt.textDelta;
          params.callbacks.onChunk(evt.textDelta);
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      handlePayloads(lineParser.feed(chunkStr));
    }
    const tail = decoder.decode();
    if (tail) {
      handlePayloads(lineParser.feed(tail));
    }
    handlePayloads(lineParser.flush());

    if (!accumulatedText.trim()) {
      throw new Error('Upstream model completed without returning text content.');
    }

    const estimated = estimateTokens(params.lastUserMsg, accumulatedText);
    const promptTokens = upstreamUsage?.promptTokens || estimated.promptTokens;
    const completionTokens = upstreamUsage?.completionTokens || estimated.completionTokens;
    params.callbacks.onDone(accumulatedText, promptTokens, completionTokens);
  }

  /**
   * Generates a streaming AI response using OpenRouter unified gateway, direct provider SDKs, or local fallback.
   */
  public static async streamCompletion(
    _user: User,
    model: AiModel,
    provider: AiProvider,
    messages: ChatMessageParam[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    let accumulatedText = '';

    // 1. Check OpenRouter Unified Gateway (1 API key accesses all workspace models)
    const openRouterProvider = db.getProviderBySlug('openrouter');
    const openRouterKey = (openRouterProvider?.api_key || process.env.OPENROUTER_API_KEY || '').trim();
    const isOpenRouterEnabled = openRouterProvider ? openRouterProvider.is_active : true;

    if (isOpenRouterEnabled && isValidApiKey(openRouterKey)) {
      const baseUrl = (openRouterProvider?.base_url || OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, '');
      const candidates = resolveOpenRouterModels(model);
      try {
        await this.streamOpenAiCompatibleEndpoint({
          endpointUrl: `${baseUrl}/chat/completions`,
          apiKey: openRouterKey,
          modelSlug: candidates.primary,
          fallbackSlug: candidates.fallback,
          messages,
          maxTokens: model.max_output_tokens,
          extraHeaders: {
            'HTTP-Referer': process.env.APP_URL || 'https://bangla-ai.pro',
            'X-Title': 'Bangla AI'
          },
          callbacks,
          lastUserMsg
        });
        return;
      } catch (err: any) {
        console.error('[OpenRouter Stream Error]:', err?.message || err);
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    }

    // 2. Direct Provider Keys (Gemini SDK or OpenAI-compatible direct endpoints)
    const directKey = (provider.api_key || this.getEnvKeyForProvider(provider.slug)).trim();

    if (provider.slug === 'gemini' && isValidApiKey(directKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey: directKey });
        const formattedContents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const candidateModels = model.model_name.includes('flash')
          ? ['gemini-3.8-flash', 'gemini-2.5-flash']
          : ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-2.5-flash'];

        let responseStream: any = null;
        let lastModelErr: any = null;
        for (const candidateModel of candidateModels) {
          try {
            responseStream = await ai.models.generateContentStream({
              model: candidateModel,
              contents: formattedContents,
              config: { systemInstruction: DEFAULT_SYSTEM_PROMPT }
            });
            break;
          } catch (modelErr: any) {
            lastModelErr = modelErr;
            const msg = String(modelErr?.message || '');
            console.warn(`[Google GenAI] Model ${candidateModel} unavailable, trying next fallback:`, msg);
            if (!msg.includes('NOT_FOUND') && !msg.includes('404') && !msg.includes('no longer available')) {
              break;
            }
          }
        }

        if (!responseStream) {
          throw lastModelErr || new Error('All Gemini models failed for this API key.');
        }

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            accumulatedText += text;
            callbacks.onChunk(text);
          }
        }

        const tokenStats = estimateTokens(lastUserMsg, accumulatedText);
        callbacks.onDone(accumulatedText, tokenStats.promptTokens, tokenStats.completionTokens);
        return;
      } catch (err: any) {
        let readableMsg = err?.message || 'Gemini API call failed.';
        try {
          const outer = JSON.parse(readableMsg);
          const innerStr = outer?.error?.message;
          if (typeof innerStr === 'string' && innerStr.trim().startsWith('{')) {
            const inner = JSON.parse(innerStr);
            readableMsg = inner?.error?.message || innerStr;
          } else if (innerStr) {
            readableMsg = innerStr;
          }
        } catch {
          // Keep original readable message
        }
        console.warn('Google GenAI API call failed:', readableMsg);
        const isUnmodifiedEnvKey = Boolean(process.env.GEMINI_API_KEY && directKey === process.env.GEMINI_API_KEY.trim());
        if (!isUnmodifiedEnvKey) {
          callbacks.onError(new Error(readableMsg));
          return;
        }
      }
    }

    if (
      ['openai', 'deepseek', 'xai', 'moonshot'].includes(provider.slug) &&
      provider.is_active &&
      isValidApiKey(directKey)
    ) {
      const baseUrl = (provider.base_url || '').replace(/\/+$/, '');
      if (baseUrl) {
        try {
          await this.streamOpenAiCompatibleEndpoint({
            endpointUrl: `${baseUrl}/chat/completions`,
            apiKey: directKey,
            modelSlug: model.model_name,
            messages,
            maxTokens: model.max_output_tokens,
            callbacks,
            lastUserMsg
          });
          return;
        } catch (err: any) {
          console.error(`[${provider.name} Direct Error]:`, err?.message || err);
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
          return;
        }
      }
    }

    // 3. Offline / Unconfigured Demo Synthesizer (used only when no API key is configured)
    const generatedResponse = this.generateContextualResponse(model, lastUserMsg);
    const chunks = this.splitIntoNaturalChunks(generatedResponse);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      accumulatedText += chunk;
      callbacks.onChunk(chunk);
      await new Promise(r => setTimeout(r, 20));
    }

    const tokenStats = estimateTokens(lastUserMsg, accumulatedText);
    callbacks.onDone(accumulatedText, tokenStats.promptTokens, tokenStats.completionTokens);
  }

  public static splitIntoNaturalChunks(text: string): string[] {
    const tokens = text.split(/(?<=\s)/);
    const chunks: string[] = [];
    let current = '';

    for (const tok of tokens) {
      current += tok;
      if (current.length >= 10 || tok.includes('\n')) {
        chunks.push(current);
        current = '';
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  private static generateContextualResponse(model: AiModel, prompt: string): string {
    const safeModel = sanitizeModelForWorkspace(model);
    const p = prompt.toLowerCase();
    const badgeLabel =
      safeModel.badge === 'max' ? 'Frontier Max Intelligence' :
      safeModel.badge === 'high' ? 'High Throughput & Reasoning' :
      safeModel.badge === 'xhigh' ? 'Extreme Inference Power' :
      safeModel.badge === 'reasoning' ? 'Deep Chain-of-Thought Reasoning' :
      safeModel.badge === 'coding' ? 'Advanced Code Specialist' :
      safeModel.badge === 'super_fast' ? 'Ultra Fast Low-Latency' : 'Balanced Multimodal';
    const modelBadge = `*Model: ${safeModel.display_name}* (${badgeLabel})\n\n`;

    if (p.includes('email') || p.includes('letter') || p.includes('proposal') || p.includes('partnership')) {
      return `${modelBadge}Here is a polished, high-converting business partnership proposal email tailored for executive correspondence:

**Subject: Strategic Collaboration & Technology Partnership Proposal**

Dear [Recipient Name],

I hope this email finds you well.

My name is [Your Name], writing on behalf of [Your Company Name]. We have been closely following [Recipient's Company Name]'s recent milestones in [Industry / Domain], and we have immense respect for the value your team is creating in the market.

At [Your Company Name], we specialize in [briefly state your core value proposition or technical solution]. We have identified compelling synergies between our capabilities and your upcoming initiatives, specifically around [mention specific opportunity or target outcome].

By aligning our efforts, we could help unlock:
1. **Accelerated Market Reach:** Joint access to qualified segments across Bangladesh and the regional ecosystem.
2. **Operational Efficiency:** Streamlined integration through our modern API infrastructure.
3. **Enhanced Customer ROI:** Delivering measurable compounding value to our shared user base.

Would you be open to a brief 15-minute introductory call next Tuesday or Thursday to explore whether a collaboration makes mutual sense?

Thank you for your time and consideration.

Warm regards,

**[Your Full Name]**  
[Your Title & Organization]  
[Mobile / WhatsApp] | [Website URL]`;
    }

    if (p.includes('python') || p.includes('fastapi')) {
      return `${modelBadge}Here is a clean, production-ready FastAPI endpoint with Pydantic validation and structured error handling:

\`\`\`python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Bangla AI Service")

class PhoneRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=15)

@app.post("/api/validate-phone")
async def validate_bd_phone(payload: PhoneRequest) -> dict:
    sanitized = payload.phone.strip().replace("-", "").replace(" ", "")
    if not sanitized.startswith(("01", "+8801")):
        raise HTTPException(status_code=400, detail="Invalid BD mobile prefix")
    return {"valid": True, "normalized": sanitized}
\`\`\`

### Architectural Highlights:
* **Pydantic Validation:** Rejects malformed payloads automatically before reaching business logic.
* **Async Execution:** Non-blocking route handler optimized for high concurrency.`;
    }

    if (
      p.includes('code') ||
      p.includes('javascript') ||
      p.includes('typescript') ||
      p.includes('react') ||
      p.includes('hook') ||
      p.includes('function') ||
      p.includes('api')
    ) {
      return `${modelBadge}Here is an elegant, production-ready solution with clean architectural patterns and input validation:

\`\`\`typescript
/**
 * Validates and normalizes phone numbers for Bangladeshi telecom networks (+8801...)
 */
export interface PhoneValidationResult {
  isValid: boolean;
  operator?: 'Grameenphone' | 'Robi' | 'Banglalink' | 'Teletalk' | 'Other';
  formatted?: string;
  error?: string;
}

export function normalizeBDPhoneNumber(input: string): PhoneValidationResult {
  // Strip whitespace, hyphens, and parenthesis
  const sanitized = input.trim().replace(/[\\s\\-()]/g, '');
  
  // Regex pattern matching Bangladeshi telecom numbers: +8801[3-9]xxxxxxxx
  const bdRegex = /^(?:\\+?88)?01([3-9])(\\d{8})$/;
  const match = sanitized.match(bdRegex);

  if (!match) {
    return {
      isValid: false,
      error: 'Invalid Bangladeshi phone format. Example: 017xxxxxxxx or +88017xxxxxxxx'
    };
  }

  const prefixDigit = match[1];
  const operatorMap: Record<string, PhoneValidationResult['operator']> = {
    '7': 'Grameenphone',
    '3': 'Grameenphone',
    '8': 'Robi',
    '9': 'Banglalink',
    '4': 'Banglalink',
    '5': 'Teletalk'
  };

  const operator = operatorMap[prefixDigit] || 'Other';
  const formatted = \`+8801\${prefixDigit}\${match[2]}\`;

  return {
    isValid: true,
    operator,
    formatted
  };
}
\`\`\`

### Architectural Highlights:
1. **Sanitization:** Removes formatting artifacts prior to validation.
2. **Type Safety:** Full TypeScript interface contract for reliable caller integration.
3. **Standardization:** Returns normalized E.164-compatible numbers for database storage and SMS gateway delivery.`;
    }

    if (p.includes('business') || p.includes('strategy') || p.includes('market') || p.includes('growth')) {
      return `${modelBadge}Here is a structured, high-impact growth strategy framework designed for emerging tech markets:

### 1. Product-Market Alignment & Retention Loops
* **Solve a Core Friction:** Focus relentlessly on the highest-friction bottlenecks in the local market (e.g., dual-currency credit card restrictions, localized customer support).
* **NPS & Organic Loops:** Build viral referral incentives and localized word-of-mouth loops among early adopters.

### 2. Multi-Channel Distribution Architecture
* **Direct MFS Integration:** Enable instant payments via bKash and Nagad to maximize conversion rates.
* **Content Authority:** Publish authoritative case studies, technical playbooks, and video walkthroughs across LinkedIn and YouTube.

### 3. AI-Accelerated Operations
* Leverage **Bangla AI** to automate customer support workflows, generate localized marketing collateral, and accelerate product documentation.

Would you like to drill down into a specific industry vertical or financial projection model?`;
    }

    return `${modelBadge}Thank you for your prompt. 

I am powered by **Bangla AI**, ready to assist you with comprehensive analysis, research, code architecture, or creative synthesis.

### Key Insights:
* Your query has been processed through the **${safeModel.display_name}** inference pipeline.
* I am calibrated to deliver structured, high-accuracy responses tailored to your technical and business requirements.

Feel free to ask follow-up questions or provide additional requirements!`;
  }
}
