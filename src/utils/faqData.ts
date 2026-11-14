export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: 'getting-started' | 'models' | 'features' | 'plans-billing' | 'privacy-control';
  label: string;
  items: readonly FaqItem[];
}

export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    items: [
      {
        question: 'What is Bangla-AI.pro and how does it work?',
        answer:
          'Bangla-AI.pro is a unified multi-model AI workspace built for Bangladesh. With a single subscription, you get instant access to leading foundation models—including Claude Fable 5.2, Gemini 4 Carbon, GPT-6 Astra, Grok 4.7, DeepSeek V4.1, and Kimi K3.1—without juggling multiple accounts or foreign dollar cards.',
      },
      {
        question: 'How do I create an account and start chatting?',
        answer:
          'Click "Get Started" in the navigation bar to create your Bangla-AI.pro account with your email and phone number. Once signed in, pick either the Monthly (৳699) or Yearly (৳5,999) plan, complete your bKash, Nagad, or Rocket payment verification, and open the AI Workspace immediately.',
      },
      {
        question: 'Do I need an international credit card or passport endorsement?',
        answer:
          'No. Bangla-AI.pro was engineered specifically to solve the cross-border payment roadblock in Bangladesh. Standard bKash, Nagad, or Rocket accounts are 100% sufficient—no dual-currency card or passport endorsement required.',
      },
      {
        question: 'Can I use Bangla-AI.pro on both desktop and mobile browsers?',
        answer:
          'Yes. The entire chat workspace, side-by-side model switcher, syntax-highlighted code blocks, and billing dashboard are fully responsive and work smoothly on desktop, tablet, and mobile browsers.',
      },
    ],
  },
  {
    id: 'models',
    label: 'Models',
    items: [
      {
        question: 'Which AI models are included in a Bangla-AI.pro subscription?',
        answer:
          'You get access to our curated lineup of 10 frontier foundation models—including Claude Fable 5.2 (max), Gemini 4 Carbon (high), GPT-6 Astra (max), Grok 4.7 (xhigh), DeepSeek V4.1 Flash 1017 (max), Kimi K3.1 Pro, and more—all inside one unified workspace.',
      },
      {
        question: 'Can I switch between Gemini 4 Carbon, GPT-6 Astra, and Claude Fable 5.2 in the same chat?',
        answer:
          'Yes! You can switch foundation models on the fly using the model selector inside the chat workspace. Your conversation context is preserved across model switches so you can combine the best reasoning, coding, and writing strengths.',
      },
      {
        question: 'Which model is best for software engineering and debugging?',
        answer:
          'Claude Fable 5.2 (max) and GPT-6 Astra (max) excel at full-stack engineering, refactoring, and architecture reviews, while DeepSeek V4.1 Flash 1017 (max) provides fast, high-accuracy algorithmic and mathematical reasoning.',
      },
      {
        question: 'Does Bangla-AI.pro understand and generate natural Bengali (বাংলা)?',
        answer:
          'Yes. Claude Fable 5.2, GPT-6 Astra, and Gemini 4 Carbon deliver fluent conversational Bengali, accurate English-to-Bangla translation, academic summaries, and high-converting local marketing copy.',
      },
      {
        question: 'Are newly released foundation models added to the platform?',
        answer:
          'Yes. We continuously update our curated model roster as new frontier releases arrive, and Yearly Plan subscribers receive priority early access to newly released foundation models.',
      },
      {
        question: 'Why do different models give different styles of responses?',
        answer:
          'Each foundation model is optimized for distinct workflows—some specialize in long-context synthesis and research (such as Gemini 4 Carbon and Kimi K3.1), while others focus on clean production code or persuasive prose.',
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    items: [
      {
        question: 'Can I upload images, screenshots, and code or data files to the chat?',
        answer:
          'Yes. You can attach files via the upload button, drag and drop files onto the chat area, or paste screenshots directly from your clipboard (Ctrl+V / Cmd+V). PNG, JPG, and WEBP images plus .txt, .md, .csv, .json, .js, .ts, .py, .html, and .css files are all supported.',
      },
      {
        question: 'Can I stop an AI response while it is streaming?',
        answer:
          'Yes. While a model is actively generating or streaming tokens, the Send button turns into a square Stop button so you can halt generation immediately while keeping the output generated so far.',
      },
      {
        question: 'Does Bangla-AI.pro save my chat history across sessions?',
        answer:
          'Yes. Every chat session is persisted cleanly under your account so you can revisit previous conversations, organize threads in your sidebar, and continue complex workflows anytime.',
      },
      {
        question: 'How are code snippets and technical outputs formatted?',
        answer:
          'Code blocks render inside crisp IDE-styled containers with language labels, syntax highlighting, and one-click copy buttons—making it effortless to review and reuse TypeScript, Python, SQL, HTML, and CSS outputs.',
      },
      {
        question: 'Can I use Bangla-AI.pro to analyze spreadsheets, documents, and research briefs?',
        answer:
          'Yes. Attach CSV datasets, Markdown notes, or JSON payloads directly in your prompt to summarize findings, extract structured insights, or debug configuration files cleanly.',
      },
      {
        question: 'Can I use Bangla-AI.pro for team or commercial software projects?',
        answer:
          'Absolutely. All code, copy, and creative content generated on Bangla-AI.pro belongs 100% to you and is free for commercial use in client deliverables, software products, and marketing campaigns.',
      },
    ],
  },
  {
    id: 'plans-billing',
    label: 'Plans & billing',
    items: [
      {
        question: 'What subscription plans does Bangla-AI.pro offer?',
        answer:
          'We offer two simple plans: the Monthly Plan at ৳699/month (1,000,000 tokens) and the Yearly Plan at ৳5,999/year (15,000,000 tokens)—saving you ৳2,389 (28%, equivalent to ৳500/month) compared to monthly billing.',
      },
      {
        question: 'How does payment verification work with bKash, Nagad, and Rocket?',
        answer:
          'When you select a plan, checkout displays our official payment number. Send the exact plan amount (৳699 or ৳5,999) from your bKash, Nagad, or Rocket app, then submit your sender phone number and SMS Transaction ID (TrxID). Our team verifies the TrxID against MFS logs and activates your subscription right away.',
      },
      {
        question: 'What is the token quota and what happens if I reach the limit?',
        answer:
          'Monthly subscriptions provide 1,000,000 (1M) tokens per billing cycle, and Yearly subscriptions provide 15,000,000 (15M) tokens. You can monitor your real-time token consumption on your Account & Billing page and renew or upgrade anytime.',
      },
      {
        question: 'Are there any automatic recurring card charges or hidden fees?',
        answer:
          'No. All payments use manual bKash, Nagad, or Rocket Send Money verification, so you are never charged unexpectedly via recurring card deductions.',
      },
      {
        question: 'What additional perks come with the Yearly Plan?',
        answer:
          'Beyond saving 28% annually, Yearly Plan members get 15M tokens, early access to newly released foundation models, dedicated high-throughput VIP server allocation, and priority concierge support.',
      },
      {
        question: 'How quickly does my account activate after submitting the TrxID?',
        answer:
          'Payments submitted with a valid bKash, Nagad, or Rocket TrxID are verified rapidly by our admin team. Once approved, your active subscription and full AI workspace unlock immediately.',
      },
    ],
  },
  {
    id: 'privacy-control',
    label: 'Privacy & control',
    items: [
      {
        question: 'Are my prompts and proprietary code used to train public AI models?',
        answer:
          'No. Bangla-AI.pro enforces strict zero public training rules—user prompts, proprietary source code, and uploaded context files are never fed into public AI training datasets.',
      },
      {
        question: 'How is my data secured during chat and payment verification?',
        answer:
          'All prompts, model responses, authentication cookies, and token streams travel across TLS 1.3 encrypted channels with strict server-side validation and account isolation.',
      },
      {
        question: 'Who owns the code and content generated on Bangla-AI.pro?',
        answer:
          'You retain 100% ownership and full commercial rights over every response, script, article, and artifact you create inside your Bangla-AI.pro workspace.',
      },
      {
        question: 'Can I manage or delete my saved chat conversations?',
        answer:
          'Yes. You remain in control of your workspace threads and can delete or manage saved conversation sessions directly from your chat history sidebar.',
      },
      {
        question: 'How do I contact Bangla-AI.pro for account or privacy support?',
        answer:
          'You can reach our Dhaka support team directly via WhatsApp (+880 1622-860128) or email at ourbangla.ai@gmail.com for any billing, technical, or privacy requests.',
      },
    ],
  },
] as const;

export function getFaqCategoryById(id: FaqCategory['id']): FaqCategory {
  return FAQ_CATEGORIES.find((category) => category.id === id) ?? FAQ_CATEGORIES[0];
}
