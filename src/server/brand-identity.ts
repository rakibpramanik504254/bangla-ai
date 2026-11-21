/**
 * Brand Identity Protection & Greeting Handler for Bangla AI
 *
 * Ensures every model greets users as "Bangla AI" and never leaks its underlying
 * vendor, creator company, or actual model name (e.g. OpenAI, Google, Gemini,
 * Anthropic, Claude, DeepSeek, Alibaba, Qwen, Meta, Llama, xAI, Grok, OpenRouter).
 */

export const BANGLA_AI_BRAND_SYSTEM_RULES = `
BRAND IDENTITY & GREETING RULES (STRICT — ALWAYS FOLLOW):
1. Your sole identity is **Bangla AI**, an all-in-one AI assistant built for Bangladesh and global users.
2. When a user greets you (e.g. "hi", "hello", "hey", "salam", "হাই", "হ্যালো", "আসসালামু আলাইকুম"), warmly welcome them to **Bangla AI** in the same language they used (for example: "Welcome to Bangla AI! How can I help you today?" in English, or "Bangla AI-তে আপনাকে স্বাগতম! আজ কীভাবে আপনাকে সাহায্য করতে পারি?" in Bengali).
3. NEVER reveal, mention, or claim to be any underlying AI model, version, API gateway, or creator company — including OpenAI, ChatGPT, GPT, Google, Gemini, Anthropic, Claude, DeepSeek, Alibaba, Qwen, Meta, Llama, xAI, Grok, Moonshot, Kimi, Mistral, Cohere, Perplexity, or OpenRouter — when introducing yourself or describing what/who you are.
4. If the user asks who you are, what model you are, who created/trained you, or whether you are ChatGPT/Gemini/Claude/DeepSeek/Qwen/Llama, ALWAYS answer solely as **Bangla AI** (for example: "I am Bangla AI, your all-in-one AI assistant. How can I help you today?"). Never mention any third-party company or backend model name.
5. Never begin a response with "As an AI language model trained by..." or similar vendor disclosures.`;

const VENDOR_OR_MODEL_EN =
  '(?:OpenAI|ChatGPT|GPT(?:-?\\d+(?:\\.\\d+)*(?:o|-?mini|-?turbo)?)?|Google(?:\\s+DeepMind|\\s+AI)?|Gemini(?:\\s+\\d+(?:\\.\\d+)*(?:\\s*(?:Pro|Flash|Ultra|Nano))?)?|Anthropic|Claude(?:\\s+\\d+(?:\\.\\d+)*(?:\\s*(?:Opus|Sonnet|Haiku))?)?|DeepSeek(?:-?(?:R\\d+|V\\d+(?:\\.\\d+)*|Chat|Coder))?|Alibaba(?:\\s+Cloud)?|Qwen(?:\\s*\\d+(?:\\.\\d+)*)?|Meta(?:\\s+AI)?|Llama(?:\\s*\\d+(?:\\.\\d+)*)?|xAI|Grok(?:\\s*\\d+(?:\\.\\d+)*)?|Moonshot(?:\\s+AI)?|Kimi|Mistral(?:\\s+AI)?|OpenRouter|Cohere|Perplexity|Microsoft(?:\\s+Copilot)?)';

const VENDOR_OR_MODEL_BN =
  '(?:ওপেনএআই|চ্যাটজিপিটি|জিপিটি|গুগল|জেমিনি|অ্যানথ্রপিক|ক্লড|ডিপসিক|আলিবাবা|কিউয়েন|কোয়েন|মেটা|লামা|এক্সএআই|গ্রক|মুনশট|কিমি|মিস্ট্রাল|ওপেনরাউটার)';

const BENGALI_SCRIPT_REGEX = /[\u0980-\u09FF]/;
const BANGLISH_HINT_REGEX =
  /\b(?:kemon|kmn|acho|achen|tumi|tomar|tomake|apni|apnar|ke|kon|ki|baniyeche|banaisey|banaiso|banache|valo|bhalo|vai|bhai|assalamu|alaikum|salam|namaskar|nomoshkar)\b/i;

function detectUserLanguage(text: string): 'bn' | 'banglish' | 'en' {
  if (BENGALI_SCRIPT_REGEX.test(text)) return 'bn';
  if (BANGLISH_HINT_REGEX.test(text)) return 'banglish';
  return 'en';
}

const PURE_GREETING_EN_REGEX =
  /^(?:h+i+|h+e+l+o+|h+e+y+|h+o+l+a+|yo+|sup|greetings|good\s+(?:morning|afternoon|evening|night)|gm|ge|hi+\s+there|hello+\s+there|hey+\s+there|how\s+are\s+you(?:\s+doing)?|what'?s\s+up|ass?alamu?\s*a?laikum|salam|wa\s*alaikum\s*salam|namaskar|nomoshkar|kemon\s+ach(?:o|en)|kmn\s+ach(?:o|en)|ki\s+obostha|hi+\s+bangla\s*ai|hello+\s+bangla\s*ai|hey+\s+bangla\s*ai)[!?.~,\s]*$/i;

const PURE_GREETING_BN_REGEX =
  /^(?:হাই|হ্যালো|হেলো|হেই|সালাম|আসসালামু\s*আলাইকুম|নমস্কার|শুভ\s*(?:সকাল|দুপুর|বিকাল|সন্ধ্যা|রাত্রি)|কেমন\s*(?:আছো|আছ|আছেন)|কি\s*অবস্থা|কী\s*অবস্থা|হাই\s*বাংলা\s*এআই|হ্যালো\s*বাংলা\s*এআই)[!?.।~,\s]*$/;

const DIRECT_IDENTITY_EN_REGEX =
  /^(?:(?:hi+|hello+|hey+)[,!.\s]+)?(?:who\s+are\s+you|what\s+are\s+you|what(?:'s|\s+is)\s+your\s+name|tell\s+me\s+(?:about\s+yourself|your\s+name)|which\s+(?:ai|llm|model)\s+(?:are\s+you|is\s+this)|what\s+(?:ai|llm|model)\s+(?:are\s+you|is\s+this|version\s+are\s+you)|who\s+(?:made|created|built|developed|trained|owns)\s+you|which\s+company\s+(?:made|created|built|developed|owns)\s+you|are\s+you\s+(?:chatgpt|gpt[\w.-]*|openai|gemini|google|claude|anthropic|deepseek|qwen|alibaba|llama|meta|grok|xai|kimi|mistral|an?\s+ai(?:\s+model)?)|introduce\s+yourself|tumi\s+ke|apni\s+ke|tumi\s+kon\s+(?:model|ai)|apni\s+kon\s+(?:model|ai)|tomar\s+nam\s+ki|tomake\s+ke\s+(?:baniyeche|banaisey|banaiso|toiri\s+koreche)|eta\s+kon\s+(?:model|ai)|actual\s+(?:kon\s+)?model)[?!.\s]*$/i;

const DIRECT_IDENTITY_BN_REGEX =
  /^(?:(?:হাই|হ্যালো|হেই)[,!\s]+)?(?:তুমি\s*কে|আপনি\s*কে|তুমি\s*কোন\s*(?:মডেল|এআই|ai)|আপনি\s*কোন\s*(?:মডেল|এআই|ai)|এটা\s*কোন\s*(?:মডেল|এআই|ai)|তোমার\s*নাম\s*(?:কি|কী)|আপনার\s*নাম\s*(?:কি|কী)|তোমাকে\s*কে\s*(?:বানিয়েছে|বানিয়েছে|তৈরি\s*করেছে|বানাইছে)|আপনাকে\s*কে\s*(?:বানিয়েছে|বানিয়েছে|তৈরি\s*করেছে)|তুমি\s*কি\s*(?:চ্যাটজিপিটি|জিপিটি|জেমিনি|ক্লড|ডিপসিক|কিউয়েন|লামা|গ্রক|chatgpt|gpt|gemini|claude|deepseek|qwen|llama))[?!.।\s]*$/i;

/**
 * Returns an instant Bangla AI branded response for standalone greetings or direct
 * identity/model-probing questions (when no attachments are included).
 * Returns null for all normal queries so they route to the live AI model.
 */
export function matchInstantBrandResponse(
  rawUserText: string,
  hasAttachments: boolean = false
): string | null {
  if (hasAttachments) return null;
  const trimmed = (rawUserText || '').trim();
  if (!trimmed || trimmed.length > 90) return null;

  const lang = detectUserLanguage(trimmed);

  if (PURE_GREETING_EN_REGEX.test(trimmed) || PURE_GREETING_BN_REGEX.test(trimmed)) {
    if (lang === 'bn') {
      if (/আসসালামু|সালাম/.test(trimmed)) {
        return 'ওয়ালাইকুম আসসালাম! **Bangla AI**-তে আপনাকে স্বাগতম। আজ কীভাবে আপনাকে সাহায্য করতে পারি?';
      }
      return '**Bangla AI**-তে আপনাকে স্বাগতম! আমি আপনার স্মার্ট AI অ্যাসিস্ট্যান্ট — আজ কীভাবে আপনাকে সাহায্য করতে পারি?';
    }
    if (lang === 'banglish') {
      if (/salam|alaikum/i.test(trimmed)) {
        return 'Walaikum Assalam! Welcome to **Bangla AI**. Aj kivabe apnake help korte pari?';
      }
      return 'Welcome to **Bangla AI**! Ami apnar smart AI assistant — aj kivabe apnake help korte pari?';
    }
    return 'Welcome to **Bangla AI**! I am your intelligent AI assistant. How can I help you today?';
  }

  if (DIRECT_IDENTITY_EN_REGEX.test(trimmed) || DIRECT_IDENTITY_BN_REGEX.test(trimmed)) {
    if (lang === 'bn') {
      return 'আমি **Bangla AI** — আপনার অল-ইন-ওয়ান স্মার্ট AI অ্যাসিস্ট্যান্ট। লেখালেখি, কোডিং, রিসার্চ, ট্রান্সলেশন বা যেকোনো প্রশ্নে আমি আপনাকে সাহায্য করতে পারি। বলুন, আজ কী নিয়ে কাজ করব?';
    }
    if (lang === 'banglish') {
      return 'Ami **Bangla AI** — apnar all-in-one smart AI assistant. Writing, coding, research, ba jekono proshne ami apnake help korte pari. Bolun, aj ki niye kaj korbo?';
    }
    return 'I am **Bangla AI**, your all-in-one intelligent AI assistant built to help with writing, coding, research, analysis, and everyday tasks. How can I assist you today?';
  }

  return null;
}

const IDENTITY_LEAK_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // "I am / I'm Claude, an AI assistant created by Anthropic" or "I am DeepSeek, developed by DeepSeek"
  {
    pattern: new RegExp(
      `\\b(I(?:'m|\\s+am))\\s+${VENDOR_OR_MODEL_EN}(?:,\\s*(?:(?:an?\\s+)?(?:AI(?:\\s+assistant)?|large\\s+language\\s+model|language\\s+model|assistant|chatbot)\\s*)?(?:(?:created|developed|built|trained|made|powered)\\s+by\\s+${VENDOR_OR_MODEL_EN})?)?`,
      'gi'
    ),
    replacement: '$1 Bangla AI'
  },
  // "My name is ChatGPT / Gemini / DeepSeek / Qwen..."
  {
    pattern: new RegExp(`\\b(My\\s+name\\s+is)\\s+${VENDOR_OR_MODEL_EN}\\b`, 'gi'),
    replacement: '$1 Bangla AI'
  },
  // "I am a large language model, trained/developed/created/built by Google/OpenAI/..."
  {
    pattern: new RegExp(
      `\\b(I(?:'m|\\s+am))\\s+(?:an?\\s+)?(?:large\\s+language\\s+model|AI\\s+(?:language\\s+model|assistant|model)|chatbot),?\\s+(?:created|developed|built|trained|made|engineered|powered)\\s+by\\s+${VENDOR_OR_MODEL_EN}(?:\\s+and\\s+${VENDOR_OR_MODEL_EN})?`,
      'gi'
    ),
    replacement: '$1 Bangla AI, an intelligent AI assistant'
  },
  // "I was created/trained/developed/built/made by OpenAI / Google / Anthropic / DeepSeek / Alibaba..."
  {
    pattern: new RegExp(
      `\\bI\\s+(?:was|am|have\\s+been)\\s+(?:created|developed|built|trained|made|engineered|designed|powered)\\s+by\\s+${VENDOR_OR_MODEL_EN}(?:\\s+and\\s+${VENDOR_OR_MODEL_EN})?`,
      'gi'
    ),
    replacement: 'I am Bangla AI'
  },
  // "As an AI (assistant/language model) created/developed/trained by <vendor>"
  {
    pattern: new RegExp(
      `\\bAs\\s+(?:an?\\s+)?(?:AI(?:\\s+(?:assistant|language\\s+model|model))?|large\\s+language\\s+model|${VENDOR_OR_MODEL_EN})(?:,?\\s*(?:created|developed|built|trained|made|powered)\\s+by\\s+${VENDOR_OR_MODEL_EN})?`,
      'gi'
    ),
    replacement: 'As Bangla AI'
  },
  // "developed by OpenAI / trained by Google / created by Anthropic / powered by OpenRouter..."
  {
    pattern: new RegExp(
      `\\b(?:created|developed|built|trained|made|engineered|powered)\\s+by\\s+${VENDOR_OR_MODEL_EN}\\b`,
      'gi'
    ),
    replacement: 'powered by Bangla AI'
  },
  // "I am powered by / running on / based on <model/vendor>"
  {
    pattern: new RegExp(
      `\\b(I(?:'m|\\s+am))\\s+(?:powered\\s+by|running\\s+on|based\\s+on|built\\s+on)\\s+${VENDOR_OR_MODEL_EN}\\b`,
      'gi'
    ),
    replacement: '$1 Bangla AI'
  },
  // Bengali self-identification: "আমি <মডেল/কোম্পানি> ..." or "আমি একটি বৃহৎ ভাষা মডেল, যা গুগল/ওপেনএআই দ্বারা প্রশিক্ষিত"
  {
    pattern: new RegExp(
      `আমি\\s+(?:একটি\\s+)?(?:বৃহৎ\\s+ভাষা\\s+মডেল|লার্জ\\s+ল্যাঙ্গুয়েজ\\s+মডেল|এআই\\s+(?:মডেল|অ্যাসিস্ট্যান্ট|সহকারী)|AI\\s+(?:মডেল|অ্যাসিস্ট্যান্ট))[,،\\s]*(?:যা\\s+|যাকে\\s+)?(?:${VENDOR_OR_MODEL_BN}|${VENDOR_OR_MODEL_EN})(?:\\s*-?এর|\\s+এর)?\\s+(?:দ্বারা\\s+)?(?:তৈরি|প্রশিক্ষিত|নির্মিত|ডেভেলপ\\s*করা)`,
      'gi'
    ),
    replacement: 'আমি Bangla AI, আপনার স্মার্ট AI অ্যাসিস্ট্যান্ট'
  },
  {
    pattern: new RegExp(`আমি\\s+(?:হলাম\\s+|হচ্ছি\\s+)?(?:${VENDOR_OR_MODEL_BN}|${VENDOR_OR_MODEL_EN})`, 'gi'),
    replacement: 'আমি Bangla AI'
  },
  {
    pattern: new RegExp(
      `আমার\\s+নাম\\s+(?:${VENDOR_OR_MODEL_BN}|${VENDOR_OR_MODEL_EN})`,
      'gi'
    ),
    replacement: 'আমার নাম Bangla AI'
  },
  {
    pattern: new RegExp(
      `(?:${VENDOR_OR_MODEL_BN}|${VENDOR_OR_MODEL_EN})(?:\\s*-?এর|\\s+এর)?\\s+দ্বারা\\s+(?:তৈরি|প্রশিক্ষিত|নির্মিত|পরিচালিত)`,
      'gi'
    ),
    replacement: 'Bangla AI দ্বারা পরিচালিত'
  }
];

function sanitizePlainSegment(segment: string): string {
  let out = segment;
  for (const rule of IDENTITY_LEAK_RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

/**
 * Rewrites accidental first-person model/vendor self-disclosure leaks to "Bangla AI"
 * while leaving fenced code blocks and ordinary third-party discussions intact.
 */
export function sanitizeBrandIdentityLeaks(text: string): string {
  if (!text) return text;

  // Preserve fenced code blocks untouched
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, idx) => (idx % 2 === 1 ? part : sanitizePlainSegment(part)))
    .join('');
}

/**
 * Streaming sanitizer that buffers up to natural sentence/line boundaries
 * so self-disclosure leaks split across SSE token chunks are still caught cleanly.
 */
export function createStreamingBrandSanitizer() {
  let buffer = '';
  let insideCodeFence = false;

  const processSafeChunk = (text: string): string => {
    if (!text) return '';
    // Split on code fence markers so we accurately track fence state across chunks
    const segments = text.split(/(```)/g);
    let result = '';
    for (const seg of segments) {
      if (seg === '```') {
        insideCodeFence = !insideCodeFence;
        result += seg;
      } else if (insideCodeFence) {
        result += seg;
      } else {
        result += sanitizePlainSegment(seg);
      }
    }
    return result;
  };

  return {
    push(chunk: string): string {
      if (!chunk) return '';
      buffer += chunk;

      // Keep any incomplete trailing fence marker (e.g. "`" or "``") buffered
      if (buffer.endsWith('`')) {
        return '';
      }

      // Emit up to the last sentence boundary or newline so multi-token vendor phrases stay together
      const boundaryMatch = buffer.match(/^([\s\S]*?(?:[.!?।\n]+(?:\s+|$)))([\s\S]*)$/);
      if (boundaryMatch) {
        const ready = boundaryMatch[1];
        buffer = boundaryMatch[2];
        return processSafeChunk(ready);
      }

      // Safety valve for very long unbroken lines (e.g. streaming code or long lists):
      // keep the last 72 chars buffered in case a vendor phrase straddles the cut.
      if (buffer.length > 220) {
        const cutIndex = buffer.lastIndexOf(' ', buffer.length - 72);
        if (cutIndex > 40) {
          const ready = buffer.slice(0, cutIndex + 1);
          buffer = buffer.slice(cutIndex + 1);
          return processSafeChunk(ready);
        }
      }

      return '';
    },
    flush(): string {
      if (!buffer) return '';
      const remaining = buffer;
      buffer = '';
      return processSafeChunk(remaining);
    }
  };
}
