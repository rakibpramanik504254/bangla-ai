import crypto from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { PLANS, calculateExpiryDate } from '../utils/billing.ts';
import { createSeededFreeModels } from '../server/openrouter-free-models.ts';
import type {
  ChatAttachment,
  UserMemory,
  UserMemoryCategory,
  UserMemorySource,
} from '../types/index.ts';
import type { FinanceLedgerEntry } from '../utils/financeLedger.ts';
import {
  MAX_MEMORIES_PER_USER,
  MIN_MEMORY_CONTENT_CHARS,
  normalizeMemoryCategory,
  normalizeMemoryContent,
} from '../utils/userMemory.ts';
import {
  POSTGRES_SCHEMA_STATEMENTS,
  resolveEnvApiKeyForProvider,
  resolvePostgresPoolConfig,
} from './postgresConfig.ts';
import { inferDefaultBrandIcon, normalizeBrandIconKey } from '../utils/modelBrandIcons.ts';
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE
} from '../utils/seo.ts';
import { isFreeAiModel, isPaidAiModel } from '../utils/modelTier.ts';
import {
  DEFAULT_PAGE_SEO_PRESETS,
  derivePageLabelFromSlug,
  getDefaultPresetForSlug,
  normalizePageSlug,
  sortPageSeoConfigs,
  type FaqSchemaItem,
  type PageSeoConfig,
} from '../utils/seoController.ts';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  usage_limit: number;
  current_usage: number;
  firebase_uid?: string;
  avatar_url?: string;
  reset_token?: string | null;
  reset_token_expires_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: 'monthly' | 'yearly';
  plan_name: string;
  amount: number;
  currency: 'BDT';
  status: 'active' | 'expired' | 'cancelled';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_method: string;
  trx_id: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  subscription_id?: string;
  plan_id?: 'monthly' | 'yearly';
  plan_name?: string;
  amount: number;
  currency: 'BDT';
  gateway: 'bkash' | 'nagad' | 'rocket';
  trx_id: string;
  sender_number: string;
  phone?: string;
  status: 'completed' | 'pending' | 'rejected';
  admin_note?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  model_id: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id: string;
  tokens_used: number;
  attachments?: ChatAttachment[];
  created_at: string;
}

export interface AiProvider {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  base_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModel {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  description_en: string;
  custom_name?: string | null;
  default_name?: string;
  custom_icon?: string | null;
  default_icon?: string;
  custom_description?: string | null;
  default_description?: string;
  badge: 'super_fast' | 'reasoning' | 'coding' | 'balanced' | 'max' | 'high' | 'xhigh' | 'free';
  is_enabled: boolean;
  is_default: boolean;
  is_free?: boolean;
  context_window: number;
  max_output_tokens: number;
  sort_order: number;
  openrouter_model_id?: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  chat_id?: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

export interface SystemSettings {
  global_usage_limit: number;
  default_monthly_price: number;
  default_yearly_price: number;
  support_email: string;
  support_phone: string;
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  bkash_enabled?: boolean;
  nagad_enabled?: boolean;
  rocket_enabled?: boolean;
  announcement?: string;
  facebook_pixel_id?: string;
  facebook_pixel_enabled?: boolean;
  facebook_pixel_access_token?: string;
  facebook_pixel_test_code?: string;
  facebook_page_url?: string;
  seo_title?: string;
  seo_description?: string;
  seo_og_image_url?: string;
  seo_og_image_data?: string;
  mail_enabled?: boolean;
  mail_webhook_url?: string;
  mail_webhook_secret?: string;
  mail_notify_admin_on_payment?: boolean;
  gsc_verification_code?: string;
  ga4_measurement_id?: string;
  ga4_enabled?: boolean;
  robots_txt_extra?: string;
}

interface ProviderKeySettingEntry {
  api_key?: string;
  base_url?: string;
  is_active?: boolean;
  updated_at?: string;
}

interface MemoryDatabaseData {
  users: User[];
  subscriptions: Subscription[];
  payments: Payment[];
  chats: Chat[];
  messages: Message[];
  ai_providers: AiProvider[];
  ai_models: AiModel[];
  usage_records: UsageRecord[];
  settings: SystemSettings;
  provider_api_keys: Record<string, ProviderKeySettingEntry>;
  finance_ledger: FinanceLedgerEntry[];
  page_seo_configs: PageSeoConfig[];
  user_memories: UserMemory[];
}

export interface QueryExecutor {
  query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export interface PoolLike extends QueryExecutor {
  connect(): Promise<PoolClient | (QueryExecutor & { release: () => void })>;
  on?(event: string, listener: (err: Error) => void): void;
}

export interface DatabaseOptions {
  pool?: PoolLike | null;
  databaseUrl?: string;
  env?: Record<string, string | undefined>;
}

// Password hashing utility using scrypt
export function hashPassword(password: string): string {
  const salt = 'bangla_ai_salt_2026';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  return hashPassword(password) === hash;
}

function toISO(val: unknown, fallback?: string): string {
  if (!val) return fallback ?? new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  const str = String(val);
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? str : parsed.toISOString();
}

function toOptionalISO(val: unknown): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  return toISO(val);
}

function toNullableISO(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return toISO(val);
}

function createDefaultSystemSettings(): SystemSettings {
  return {
    global_usage_limit: 1000000,
    default_monthly_price: 699,
    default_yearly_price: 5999,
    support_email: 'ourbangla.ai@gmail.com',
    support_phone: '+880 1878-242764',
    facebook_page_url: 'https://www.facebook.com/profile.php?id=61596472081766',
    bkash_number: '01812345678',
    nagad_number: '01712345678',
    rocket_number: '01912345678',
    bkash_enabled: true,
    nagad_enabled: true,
    rocket_enabled: true,
    announcement: 'Welcome to Bangla AI — The Premier Unified Multi-Model AI Hub.',
    seo_title: DEFAULT_SEO_TITLE,
    seo_description: DEFAULT_SEO_DESCRIPTION,
    seo_og_image_url: DEFAULT_OG_IMAGE_PATH,
    mail_enabled: true,
    mail_webhook_url: '',
    mail_webhook_secret: '',
    mail_notify_admin_on_payment: true,
    gsc_verification_code: '',
    ga4_measurement_id: '',
    ga4_enabled: false,
    robots_txt_extra: ''
  };
}

function createInitialSeedData(env: Record<string, string | undefined> = process.env): MemoryDatabaseData {
  const now = new Date().toISOString();
  const futureMonthly = calculateExpiryDate('monthly').toISOString();
  const futureYearly = calculateExpiryDate('yearly').toISOString();

  const adminId = 'usr_admin_001';
  const subscriberId = 'usr_sub_002';
  const unpaidId = 'usr_unpaid_003';

  const users: User[] = [
    {
      id: adminId,
      email: 'rakib504254@gmail.com',
      password_hash: '',
      name: 'Rakib (Owner & Admin)',
      phone: '+8801700000000',
      role: 'admin',
      status: 'active',
      usage_limit: 1000000,
      current_usage: 0,
      firebase_uid: 'WxBGpxm5T2al2OXFX8wfXzoEtIW2',
      avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocLnZ-FD4NuHpOuJ71zbvweJxTc0lay0HXl7CkICxqreJf3UtkLeTw=s96-c',
      created_at: now,
      updated_at: now
    },
    {
      id: 'usr_admin_backup',
      email: 'admin@bangla.ai',
      password_hash: hashPassword('AdminPassword123!'),
      name: 'Super Admin',
      phone: '+8801711000000',
      role: 'admin',
      status: 'active',
      usage_limit: 1000000,
      current_usage: 1240,
      created_at: now,
      updated_at: now
    },
    {
      id: subscriberId,
      email: 'subscriber@bangla.ai',
      password_hash: hashPassword('UserPassword123!'),
      name: 'Tanvir Ahmed',
      phone: '+8801812345678',
      role: 'user',
      status: 'active',
      usage_limit: 1000000,
      current_usage: 4850,
      created_at: now,
      updated_at: now
    },
    {
      id: unpaidId,
      email: 'unpaid@bangla.ai',
      password_hash: hashPassword('UserPassword123!'),
      name: 'Rakibul Hasan',
      phone: '+8801911223344',
      role: 'user',
      status: 'active',
      usage_limit: 0,
      current_usage: 0,
      created_at: now,
      updated_at: now
    }
  ];

  const subscriptions: Subscription[] = [
    {
      id: 'sub_admin_001',
      user_id: adminId,
      plan_id: 'yearly',
      plan_name: 'Admin Enterprise Plan',
      amount: 5999,
      currency: 'BDT',
      status: 'active',
      started_at: now,
      expires_at: futureYearly,
      auto_renew: true,
      payment_method: 'system',
      trx_id: 'SYS_ADMIN_LIFETIME',
      created_at: now,
      updated_at: now
    },
    {
      id: 'sub_user_002',
      user_id: subscriberId,
      plan_id: 'monthly',
      plan_name: 'Monthly Plan (৳699)',
      amount: 699,
      currency: 'BDT',
      status: 'active',
      started_at: now,
      expires_at: futureMonthly,
      auto_renew: true,
      payment_method: 'bkash',
      trx_id: 'BKB8792019X',
      created_at: now,
      updated_at: now
    }
  ];

  const payments: Payment[] = [
    {
      id: 'pay_001',
      user_id: subscriberId,
      user_name: 'Tanvir Ahmed',
      user_email: 'subscriber@bangla.ai',
      subscription_id: 'sub_user_002',
      plan_id: 'monthly',
      plan_name: 'Monthly Plan (৳699)',
      amount: 699,
      currency: 'BDT',
      gateway: 'bkash',
      trx_id: 'BKB8792019X',
      sender_number: '01812345678',
      status: 'completed',
      created_at: now,
      approved_at: now
    }
  ];

  const ai_providers: AiProvider[] = [
    {
      id: 'prov_openrouter',
      name: 'OpenRouter Unified Gateway (All Models)',
      slug: 'openrouter',
      api_key: resolveEnvApiKeyForProvider('openrouter', env),
      base_url: 'https://openrouter.ai/api/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_gemini',
      name: 'Google Gemini',
      slug: 'gemini',
      api_key: resolveEnvApiKeyForProvider('gemini', env),
      base_url: 'https://generativelanguage.googleapis.com',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_openai',
      name: 'OpenAI',
      slug: 'openai',
      api_key: resolveEnvApiKeyForProvider('openai', env),
      base_url: 'https://api.openai.com/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_anthropic',
      name: 'Anthropic Claude',
      slug: 'anthropic',
      api_key: resolveEnvApiKeyForProvider('anthropic', env),
      base_url: 'https://api.anthropic.com/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_deepseek',
      name: 'DeepSeek AI',
      slug: 'deepseek',
      api_key: resolveEnvApiKeyForProvider('deepseek', env),
      base_url: 'https://api.deepseek.com/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_xai',
      name: 'xAI Grok',
      slug: 'xai',
      api_key: resolveEnvApiKeyForProvider('xai', env),
      base_url: 'https://api.x.ai/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: 'prov_moonshot',
      name: 'Moonshot AI (Kimi)',
      slug: 'moonshot',
      api_key: resolveEnvApiKeyForProvider('moonshot', env),
      base_url: 'https://api.moonshot.cn/v1',
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  const rawModels: AiModel[] = [
    {
      id: 'mod_gemini_4_carbon',
      provider_id: 'prov_gemini',
      model_name: 'gemini-4-carbon',
      display_name: 'Gemini 4 Carbon (high)',
      description_en: 'Next-generation Google Carbon architecture. High-efficiency inference with 2M context and native multimodal reasoning.',
      badge: 'high',
      is_enabled: true,
      is_default: true,
      context_window: 2000000,
      max_output_tokens: 16384,
      sort_order: 1,
      created_at: now
    },
    {
      id: 'mod_claude_fable_5_2',
      provider_id: 'prov_anthropic',
      model_name: 'claude-fable-5-2',
      display_name: 'Claude Fable 5.2 (max)',
      description_en: 'Anthropic pinnacle frontier intelligence. Maximum nuance, multi-turn reasoning, and literary code precision.',
      badge: 'max',
      is_enabled: true,
      is_default: false,
      context_window: 500000,
      max_output_tokens: 16384,
      sort_order: 2,
      created_at: now
    },
    {
      id: 'mod_gpt_6_astra',
      provider_id: 'prov_openai',
      model_name: 'gpt-6-astra',
      display_name: 'GPT-6 Astra (max)',
      description_en: 'OpenAI frontier flagship. Maximum general intelligence, autonomous systems design, and mathematical problem-solving.',
      badge: 'max',
      is_enabled: true,
      is_default: false,
      context_window: 1000000,
      max_output_tokens: 16384,
      sort_order: 3,
      created_at: now
    },
    {
      id: 'mod_deepseek_v4_1_flash',
      provider_id: 'prov_deepseek',
      model_name: 'deepseek-v4-1-flash-1017',
      display_name: 'DeepSeek V4.1 Flash 1017 (max)',
      description_en: 'Ultra-dense MoE architecture with instantaneous speed and deep algorithmic reasoning at fraction of traditional compute.',
      badge: 'max',
      is_enabled: true,
      is_default: false,
      context_window: 128000,
      max_output_tokens: 8192,
      sort_order: 4,
      created_at: now
    },
    {
      id: 'mod_grok_4_7',
      provider_id: 'prov_xai',
      model_name: 'grok-4-7',
      display_name: 'Grok 4.7 (xhigh)',
      description_en: 'xAI frontier real-time intelligence with extreme reasoning throughput and unfiltered technical clarity.',
      badge: 'xhigh',
      is_enabled: true,
      is_default: false,
      context_window: 256000,
      max_output_tokens: 8192,
      sort_order: 5,
      created_at: now
    },
    {
      id: 'mod_kimi_k3_1_pro',
      provider_id: 'prov_moonshot',
      model_name: 'kimi-k3-1-pro',
      display_name: 'Kimi K3.1 Pro',
      description_en: 'Moonshot AI flagship with ultra-long 2M context comprehension, document synthesis, and chain-of-thought analysis.',
      badge: 'reasoning',
      is_enabled: true,
      is_default: false,
      context_window: 2000000,
      max_output_tokens: 8192,
      sort_order: 6,
      created_at: now
    },
    {
      id: 'mod_gemini_2_5_flash',
      provider_id: 'prov_gemini',
      model_name: 'gemini-2.5-flash',
      display_name: 'Gemini 2.5 Flash',
      description_en: 'Ultra-low latency with exceptional context processing. Ideal for everyday writing and rapid query resolution.',
      badge: 'super_fast',
      is_enabled: true,
      is_default: false,
      context_window: 1000000,
      max_output_tokens: 8192,
      sort_order: 7,
      created_at: now
    },
    {
      id: 'mod_gpt_4o',
      provider_id: 'prov_openai',
      model_name: 'gpt-4o',
      display_name: 'OpenAI GPT-4o',
      description_en: 'Flagship multimodal intelligence. Excels at nuanced reasoning, creative synthesis, and full-stack coding.',
      badge: 'balanced',
      is_enabled: true,
      is_default: false,
      context_window: 128000,
      max_output_tokens: 4096,
      sort_order: 8,
      created_at: now
    },
    {
      id: 'mod_claude_3_5_sonnet',
      provider_id: 'prov_anthropic',
      model_name: 'claude-3-5-sonnet',
      display_name: 'Claude 3.5 Sonnet',
      description_en: 'Industry-leading software engineering and prose refinement. Unmatched code generation and architecture review.',
      badge: 'coding',
      is_enabled: true,
      is_default: false,
      context_window: 200000,
      max_output_tokens: 8192,
      sort_order: 9,
      created_at: now
    },
    {
      id: 'mod_deepseek_r1',
      provider_id: 'prov_deepseek',
      model_name: 'deepseek-r1',
      display_name: 'DeepSeek R1',
      description_en: 'Advanced chain-of-thought reasoning powerhouse. Specialized in mathematics, logic proofs, and complex algorithms.',
      badge: 'reasoning',
      is_enabled: true,
      is_default: false,
      context_window: 64000,
      max_output_tokens: 4096,
      sort_order: 10,
      created_at: now
    },
    ...createSeededFreeModels(now)
  ];

  const ai_models: AiModel[] = rawModels.map(m => ({
    ...m,
    custom_name: m.custom_name ?? null,
    default_name: m.default_name || m.display_name,
    custom_icon: m.custom_icon ?? null,
    default_icon: m.default_icon || inferDefaultBrandIcon(m),
    custom_description: m.custom_description ?? null,
    default_description: m.default_description || m.description_en,
  }));

  const demoChatId = 'chat_demo_001';
  const chats: Chat[] = [
    {
      id: demoChatId,
      user_id: subscriberId,
      title: 'E-commerce Launch & Growth Strategy',
      model_id: 'mod_gemini_2_5_flash',
      pinned: true,
      created_at: now,
      updated_at: now
    }
  ];

  const messages: Message[] = [
    {
      id: 'msg_001',
      chat_id: demoChatId,
      role: 'user',
      content: 'What are the essential steps to launch a scalable e-commerce business in Bangladesh?',
      model_id: 'mod_gemini_2_5_flash',
      tokens_used: 120,
      created_at: now
    },
    {
      id: 'msg_002',
      chat_id: demoChatId,
      role: 'assistant',
      content: `Launching a successful, scalable e-commerce venture in Bangladesh requires a structured strategy across four core pillars:

### 1. Legal & Regulatory Compliance
* **Trade License:** Obtain from your respective City Corporation or Union Parishad.
* **e-TIN & BIN:** Register for tax identification and VAT compliance with the NBR.
* **DBID (Digital Business ID):** Mandatory registration from the Ministry of Commerce.

### 2. Payment Infrastructure
* **Mobile Financial Services (MFS):** Integrate direct merchant accounts with bKash and Nagad (covering >80% of digital transactions).
* **Payment Gateway Aggregators:** SSLCommerz or Shurjopay for Visa, Mastercard, and internet banking.

### 3. Last-Mile Logistics & Fulfillment
* Partner with dependable courier networks such as Pathao Courier, Steadfast, or RedX with automated API tracking.
* Set up a clear Reverse Logistics & Return Management SOP.

### 4. Digital Marketing & Customer Retention
* Run targeted Meta Ads with engaging video content and WhatsApp/Messenger chat conversion funnels.
* Offer reliable Cash on Delivery (COD) alongside frictionless MFS pre-payments.`,
      model_id: 'mod_gemini_2_5_flash',
      tokens_used: 350,
      created_at: now
    }
  ];

  const usage_records: UsageRecord[] = [
    {
      id: 'usg_001',
      user_id: subscriberId,
      chat_id: demoChatId,
      model_id: 'mod_gemini_2_5_flash',
      prompt_tokens: 120,
      completion_tokens: 350,
      total_tokens: 470,
      created_at: now
    }
  ];

  const settings = createDefaultSystemSettings();
  const provider_api_keys: Record<string, ProviderKeySettingEntry> = {};
  for (const p of ai_providers) {
    provider_api_keys[p.slug] = {
      api_key: p.api_key,
      base_url: p.base_url,
      is_active: p.is_active,
      updated_at: now
    };
  }

  const page_seo_configs: PageSeoConfig[] = DEFAULT_PAGE_SEO_PRESETS.map(preset => ({
    ...preset,
    faqItems: preset.faqItems.map(item => ({ ...item })),
    updatedAt: now
  }));

  return {
    users,
    subscriptions,
    payments,
    chats,
    messages,
    ai_providers,
    ai_models,
    usage_records,
    settings,
    provider_api_keys,
    finance_ledger: [],
    page_seo_configs,
    user_memories: []
  };
}

function mapUserRow(row: any): User {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash || ''),
    name: String(row.name || ''),
    phone: String(row.phone || ''),
    role: row.role === 'admin' ? 'admin' : 'user',
    status: row.status === 'suspended' ? 'suspended' : 'active',
    usage_limit: Number(row.usage_limit ?? 0),
    current_usage: Number(row.current_usage ?? 0),
    firebase_uid: row.firebase_uid ? String(row.firebase_uid) : undefined,
    avatar_url: row.avatar_url ? String(row.avatar_url) : '',
    reset_token: row.reset_token ? String(row.reset_token) : null,
    reset_token_expires_at: toNullableISO(row.reset_token_expires_at),
    last_login_at: toNullableISO(row.last_login_at),
    created_at: toISO(row.created_at),
    updated_at: toISO(row.updated_at)
  };
}

function mapSubscriptionRow(row: any): Subscription {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan_id: row.plan_id === 'yearly' ? 'yearly' : 'monthly',
    plan_name: String(row.plan_name),
    amount: Number(row.amount),
    currency: 'BDT',
    status: row.status === 'expired' ? 'expired' : row.status === 'cancelled' ? 'cancelled' : 'active',
    started_at: toISO(row.started_at),
    expires_at: toISO(row.expires_at),
    auto_renew: Boolean(row.auto_renew),
    payment_method: String(row.payment_method || ''),
    trx_id: String(row.trx_id || ''),
    created_at: toISO(row.created_at),
    updated_at: toISO(row.updated_at)
  };
}

function mapPaymentRow(row: any): Payment {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    user_name: row.user_name ? String(row.user_name) : undefined,
    user_email: row.user_email ? String(row.user_email) : undefined,
    subscription_id: row.subscription_id ? String(row.subscription_id) : undefined,
    plan_id: row.plan_id === 'yearly' ? 'yearly' : row.plan_id === 'monthly' ? 'monthly' : undefined,
    plan_name: row.plan_name ? String(row.plan_name) : undefined,
    amount: Number(row.amount),
    currency: 'BDT',
    gateway: (row.gateway || 'bkash') as Payment['gateway'],
    trx_id: String(row.trx_id),
    sender_number: String(row.sender_number || ''),
    phone: row.phone ? String(row.phone) : undefined,
    status: row.status === 'completed' ? 'completed' : row.status === 'rejected' ? 'rejected' : 'pending',
    admin_note: row.admin_note ? String(row.admin_note) : undefined,
    created_at: toISO(row.created_at),
    approved_at: toOptionalISO(row.approved_at),
    approved_by: row.approved_by ? String(row.approved_by) : undefined
  };
}

function mapChatRow(row: any): Chat {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title),
    model_id: String(row.model_id),
    pinned: Boolean(row.pinned),
    created_at: toISO(row.created_at),
    updated_at: toISO(row.updated_at)
  };
}

function mapMessageRow(row: any): Message {
  let attachments: ChatAttachment[] | undefined;
  if (row.attachments) {
    if (Array.isArray(row.attachments)) {
      attachments = row.attachments;
    } else if (typeof row.attachments === 'string') {
      try {
        const parsed = JSON.parse(row.attachments);
        if (Array.isArray(parsed)) attachments = parsed;
      } catch {
        // Ignore malformed attachment payload
      }
    }
  }

  return {
    id: String(row.id),
    chat_id: String(row.chat_id),
    role: row.role === 'assistant' ? 'assistant' : row.role === 'system' ? 'system' : 'user',
    content: String(row.content || ''),
    model_id: String(row.model_id),
    tokens_used: Number(row.tokens_used ?? 0),
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
    created_at: toISO(row.created_at)
  };
}

function mapProviderRow(
  row: any,
  settingsKeyMap: Record<string, ProviderKeySettingEntry>,
  env: Record<string, string | undefined>
): AiProvider {
  const slug = String(row.slug);
  const settingEntry = settingsKeyMap[slug];
  const dbStoredKey = (settingEntry?.api_key ?? row.api_key ?? '').trim();
  const envFallbackKey = resolveEnvApiKeyForProvider(slug, env);
  const effectiveKey = dbStoredKey || envFallbackKey;

  return {
    id: String(row.id),
    name: String(row.name),
    slug,
    api_key: effectiveKey,
    base_url: String(settingEntry?.base_url ?? row.base_url ?? ''),
    is_active: settingEntry?.is_active !== undefined ? Boolean(settingEntry.is_active) : Boolean(row.is_active),
    created_at: toISO(row.created_at),
    updated_at: toISO(row.updated_at)
  };
}

function mapModelRow(row: any): AiModel {
  const defaultName = String(row.default_name || row.display_name || '');
  const customName = row.custom_name ? String(row.custom_name) : null;
  const defaultDesc = String(row.default_description || row.description_en || '');
  const customDesc = row.custom_description ? String(row.custom_description) : null;
  const inferredIcon = inferDefaultBrandIcon({
    id: String(row.id),
    provider_id: String(row.provider_id),
    model_name: String(row.model_name),
    openrouter_model_id: row.openrouter_model_id ? String(row.openrouter_model_id) : undefined,
    default_name: defaultName
  });
  const defaultIcon = normalizeBrandIconKey(row.default_icon) || inferredIcon;
  const customIcon = normalizeBrandIconKey(row.custom_icon);

  return {
    id: String(row.id),
    provider_id: String(row.provider_id),
    model_name: String(row.model_name),
    display_name: (customName && customName.trim()) || defaultName || String(row.display_name || ''),
    description_en: (customDesc && customDesc.trim()) || defaultDesc || String(row.description_en || ''),
    custom_name: customName,
    default_name: defaultName,
    custom_icon: customIcon,
    default_icon: defaultIcon,
    custom_description: customDesc,
    default_description: defaultDesc,
    badge: (row.badge || 'balanced') as AiModel['badge'],
    is_enabled: Boolean(row.is_enabled),
    is_default: Boolean(row.is_default),
    is_free: Boolean(row.is_free),
    context_window: Number(row.context_window ?? 128000),
    max_output_tokens: Number(row.max_output_tokens ?? 4096),
    sort_order: Number(row.sort_order ?? 0),
    openrouter_model_id: row.openrouter_model_id ? String(row.openrouter_model_id) : undefined,
    created_at: toISO(row.created_at)
  };
}

function mapUsageRow(row: any): UsageRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    chat_id: row.chat_id ? String(row.chat_id) : undefined,
    model_id: String(row.model_id),
    prompt_tokens: Number(row.prompt_tokens ?? 0),
    completion_tokens: Number(row.completion_tokens ?? 0),
    total_tokens: Number(row.total_tokens ?? 0),
    created_at: toISO(row.created_at)
  };
}

function mapFinanceLedgerRow(row: any): FinanceLedgerEntry {
  return {
    id: String(row.id),
    type: row.type === 'ad_spend' ? 'ad_spend' : 'income',
    category: row.category as FinanceLedgerEntry['category'],
    title: String(row.title),
    note: String(row.note || ''),
    amountBDT: Number(row.amount_bdt),
    date: String(row.entry_date),
    deletedAt: toNullableISO(row.deleted_at),
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at)
  };
}

function mapUserMemoryRow(row: any): UserMemory {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    content: String(row.content || ''),
    category: normalizeMemoryCategory(row.category),
    source: row.source === 'manual' ? 'manual' : 'auto',
    created_at: toISO(row.created_at),
    updated_at: toISO(row.updated_at)
  };
}

function mapPageSeoRow(row: any): PageSeoConfig {
  let faqItems: FaqSchemaItem[] = [];
  if (Array.isArray(row.faq_items)) {
    faqItems = row.faq_items
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any, idx: number) => ({
        id: String(item.id || `faq-${idx + 1}`),
        question: String(item.question || ''),
        answer: String(item.answer || '')
      }));
  } else if (typeof row.faq_items === 'string') {
    try {
      const parsed = JSON.parse(row.faq_items);
      if (Array.isArray(parsed)) {
        faqItems = parsed
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any, idx: number) => ({
            id: String(item.id || `faq-${idx + 1}`),
            question: String(item.question || ''),
            answer: String(item.answer || '')
          }));
      }
    } catch {
      faqItems = [];
    }
  }

  return {
    slug: normalizePageSlug(String(row.slug || '/')),
    pageLabel: String(row.page_label || derivePageLabelFromSlug(String(row.slug || '/'))),
    metaTitle: String(row.meta_title || ''),
    metaDescription: String(row.meta_description || ''),
    focusKeyword: String(row.focus_keyword || ''),
    ogImageUrl: String(row.og_image_url || DEFAULT_OG_IMAGE_PATH),
    twitterCard: row.twitter_card === 'summary' ? 'summary' : 'summary_large_image',
    twitterTitle: String(row.twitter_title || ''),
    twitterDescription: String(row.twitter_description || ''),
    twitterHandle: String(row.twitter_handle || '@banglaaipro'),
    canonicalOverride: String(row.canonical_override || ''),
    noIndex: Boolean(row.no_index),
    noFollow: Boolean(row.no_follow),
    faqSchemaEnabled: Boolean(row.faq_schema_enabled),
    faqItems,
    updatedAt: toISO(row.updated_at)
  };
}

export class Database {
  private pool: PoolLike | null = null;
  private memory: MemoryDatabaseData | null = null;
  private env: Record<string, string | undefined>;
  private initPromise: Promise<void> | null = null;

  constructor(options: DatabaseOptions = {}) {
    this.env = options.env || process.env;

    if (options.pool !== undefined) {
      this.pool = options.pool;
    } else {
      const poolConfig = resolvePostgresPoolConfig(
        options.databaseUrl ?? this.env.DATABASE_URL,
        this.env.NODE_ENV
      );
      if (poolConfig) {
        const pgPool = new Pool(poolConfig);
        pgPool.on('error', (err) => {
          console.error('[PostgreSQL Pool Error]:', err);
        });
        this.pool = pgPool;
      }
    }

    if (!this.pool) {
      this.memory = createInitialSeedData(this.env);
    }
  }

  public isPostgresEnabled(): boolean {
    return this.pool !== null;
  }

  public async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.performInit().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async ensureReady(): Promise<void> {
    await this.init();
  }

  private async performInit(): Promise<void> {
    if (!this.pool) {
      console.warn(
        '[DB] DATABASE_URL is not configured — running in volatile in-memory mode (no local files written). Set DATABASE_URL to enable PostgreSQL persistence.'
      );
      return;
    }

    for (const stmt of POSTGRES_SCHEMA_STATEMENTS) {
      await this.pool.query(stmt);
    }

    await this.seedPostgresIfNeeded();
    console.log('[DB] PostgreSQL connected & schema verified.');
  }

  private async seedPostgresIfNeeded(): Promise<void> {
    if (!this.pool) return;
    const seed = createInitialSeedData(this.env);

    // 1. Seed users, initial subscriptions, payments, demo chat only if users table is empty
    const userCountRes = await this.pool.query('SELECT COUNT(*)::int AS cnt FROM users');
    const userCount = Number(userCountRes.rows[0]?.cnt ?? 0);
    if (userCount === 0) {
      for (const u of seed.users) {
        await this.pool.query(
          `INSERT INTO users (
            id, email, password_hash, name, phone, role, status, usage_limit, current_usage,
            firebase_uid, avatar_url, reset_token, reset_token_expires_at, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO NOTHING`,
          [
            u.id, u.email, u.password_hash, u.name, u.phone, u.role, u.status,
            u.usage_limit, u.current_usage, u.firebase_uid || null, u.avatar_url || '',
            u.reset_token || null, u.reset_token_expires_at || null, u.created_at, u.updated_at
          ]
        );
      }

      for (const s of seed.subscriptions) {
        await this.pool.query(
          `INSERT INTO subscriptions (
            id, user_id, plan_id, plan_name, amount, currency, status, started_at, expires_at,
            auto_renew, payment_method, trx_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          ON CONFLICT (id) DO NOTHING`,
          [
            s.id, s.user_id, s.plan_id, s.plan_name, s.amount, s.currency, s.status,
            s.started_at, s.expires_at, s.auto_renew, s.payment_method, s.trx_id, s.created_at, s.updated_at
          ]
        );
      }

      for (const p of seed.payments) {
        await this.pool.query(
          `INSERT INTO payments (
            id, user_id, user_name, user_email, subscription_id, plan_id, plan_name, amount, currency,
            gateway, trx_id, sender_number, phone, status, admin_note, created_at, approved_at, approved_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (id) DO NOTHING`,
          [
            p.id, p.user_id, p.user_name || null, p.user_email || null, p.subscription_id || null,
            p.plan_id || null, p.plan_name || null, p.amount, p.currency, p.gateway, p.trx_id,
            p.sender_number, p.phone || null, p.status, p.admin_note || null, p.created_at,
            p.approved_at || null, p.approved_by || null
          ]
        );
      }

      for (const c of seed.chats) {
        await this.pool.query(
          `INSERT INTO chats (id, user_id, title, model_id, pinned, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.user_id, c.title, c.model_id, c.pinned, c.created_at, c.updated_at]
        );
      }

      for (const m of seed.messages) {
        await this.pool.query(
          `INSERT INTO messages (id, chat_id, role, content, model_id, tokens_used, attachments, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id, m.chat_id, m.role, m.content, m.model_id, m.tokens_used,
            m.attachments ? JSON.stringify(m.attachments) : null, m.created_at
          ]
        );
      }

      for (const u of seed.usage_records) {
        await this.pool.query(
          `INSERT INTO usage_records (id, user_id, chat_id, model_id, prompt_tokens, completion_tokens, total_tokens, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.user_id, u.chat_id || null, u.model_id, u.prompt_tokens, u.completion_tokens, u.total_tokens, u.created_at]
        );
      }
    }

    // 2. Idempotently ensure all providers exist (never overwriting saved API keys)
    for (const prov of seed.ai_providers) {
      await this.pool.query(
        `INSERT INTO ai_providers (id, name, slug, api_key, base_url, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          prov.id, prov.name, prov.slug, prov.api_key, prov.base_url || '',
          prov.is_active, prov.created_at, prov.updated_at
        ]
      );
    }

    // 3. Idempotently ensure all flagship + curated OpenRouter free models exist
    for (const mod of seed.ai_models) {
      await this.pool.query(
        `INSERT INTO ai_models (
          id, provider_id, model_name, display_name, description_en,
          custom_name, default_name, custom_icon, default_icon, custom_description, default_description,
          badge, is_enabled, is_default, is_free, context_window, max_output_tokens,
          sort_order, openrouter_model_id, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        ON CONFLICT (id) DO NOTHING`,
        [
          mod.id,
          mod.provider_id,
          mod.model_name,
          mod.display_name,
          mod.description_en,
          mod.custom_name ?? null,
          mod.default_name || mod.display_name,
          mod.custom_icon ?? null,
          mod.default_icon || inferDefaultBrandIcon(mod),
          mod.custom_description ?? null,
          mod.default_description || mod.description_en,
          mod.badge,
          mod.is_enabled,
          mod.is_default,
          Boolean(mod.is_free),
          mod.context_window,
          mod.max_output_tokens,
          mod.sort_order,
          mod.openrouter_model_id || null,
          mod.created_at
        ]
      );
    }

    // 3b. Safely backfill default_name / default_icon / default_description on pre-existing ai_models rows
    const unmigratedRes = await this.pool.query(
      `SELECT * FROM ai_models WHERE default_name = '' OR default_name IS NULL`
    );
    if (unmigratedRes.rows.length > 0) {
      const seedById = new Map(seed.ai_models.map(m => [m.id, m]));
      for (const row of unmigratedRes.rows) {
        const seedMatch = seedById.get(String(row.id));
        const defName = seedMatch?.default_name || String(row.display_name || '');
        const defDesc = seedMatch?.default_description || String(row.description_en || '');
        const defIcon = seedMatch?.default_icon || inferDefaultBrandIcon({
          id: String(row.id),
          provider_id: String(row.provider_id),
          model_name: String(row.model_name),
          openrouter_model_id: row.openrouter_model_id ? String(row.openrouter_model_id) : undefined,
          default_name: defName
        });
        const existingName = String(row.display_name || '').trim();
        const existingDesc = String(row.description_en || '').trim();
        const migratedCustomName =
          row.custom_name ?? (seedMatch && existingName && existingName !== defName ? existingName : null);
        const migratedCustomDesc =
          row.custom_description ?? (seedMatch && existingDesc && existingDesc !== defDesc ? existingDesc : null);

        await this.pool.query(
          `UPDATE ai_models
           SET default_name = $1,
               default_description = $2,
               default_icon = $3,
               custom_name = $4,
               custom_description = $5
           WHERE id = $6`,
          [defName, defDesc, defIcon, migratedCustomName, migratedCustomDesc, row.id]
        );
      }
    }

    // 4. Idempotently ensure system_settings and provider_api_keys exist in admin_settings
    await this.pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) DO NOTHING`,
      ['system_settings', JSON.stringify(seed.settings)]
    );

    await this.pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) DO NOTHING`,
      ['provider_api_keys', JSON.stringify(seed.provider_api_keys)]
    );

    // 5. Idempotently seed default per-page SEO configurations
    for (const seoPreset of seed.page_seo_configs) {
      await this.pool.query(
        `INSERT INTO page_seo_configs (
          slug, page_label, meta_title, meta_description, focus_keyword, og_image_url,
          twitter_card, twitter_title, twitter_description, twitter_handle, canonical_override,
          no_index, no_follow, faq_schema_enabled, faq_items, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (slug) DO NOTHING`,
        [
          seoPreset.slug,
          seoPreset.pageLabel,
          seoPreset.metaTitle,
          seoPreset.metaDescription,
          seoPreset.focusKeyword,
          seoPreset.ogImageUrl,
          seoPreset.twitterCard,
          seoPreset.twitterTitle,
          seoPreset.twitterDescription,
          seoPreset.twitterHandle,
          seoPreset.canonicalOverride,
          seoPreset.noIndex,
          seoPreset.noFollow,
          seoPreset.faqSchemaEnabled,
          JSON.stringify(seoPreset.faqItems),
          seoPreset.updatedAt || new Date().toISOString()
        ]
      );
    }
  }

  private async readProviderKeySettings(executor?: QueryExecutor): Promise<Record<string, ProviderKeySettingEntry>> {
    if (!this.pool) {
      return this.memory!.provider_api_keys;
    }
    const q = executor || this.pool;
    const res = await q.query(
      `SELECT setting_value FROM admin_settings WHERE setting_key = $1`,
      ['provider_api_keys']
    );
    if (!res.rows.length) return {};
    try {
      const parsed = JSON.parse(String(res.rows[0].setting_value));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async writeProviderKeySettings(
    map: Record<string, ProviderKeySettingEntry>,
    executor?: QueryExecutor
  ): Promise<void> {
    if (!this.pool) {
      this.memory!.provider_api_keys = map;
      return;
    }
    const q = executor || this.pool;
    await q.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      ['provider_api_keys', JSON.stringify(map)]
    );
  }

  private hydrateMemoryProvider(p: AiProvider): AiProvider {
    const entry = this.memory!.provider_api_keys[p.slug];
    const storedKey = (entry?.api_key ?? p.api_key ?? '').trim();
    const envFallback = resolveEnvApiKeyForProvider(p.slug, this.env);
    return {
      ...p,
      api_key: storedKey || envFallback,
      base_url: entry?.base_url ?? p.base_url,
      is_active: entry?.is_active !== undefined ? entry.is_active : p.is_active
    };
  }

  // --- User Operations ---
  public async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureReady();
    const normalized = email.trim().toLowerCase();
    if (!this.pool) {
      return this.memory!.users.find(u => u.email.toLowerCase() === normalized);
    }
    const res = await this.pool.query(
      `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalized]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  }

  public async getUserByPhone(phone: string): Promise<User | undefined> {
    await this.ensureReady();
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    const normalized = digits.startsWith('8801') && digits.length === 13 ? digits.slice(2) : digits;
    if (!normalized || normalized.length < 11) return undefined;

    if (!this.pool) {
      return this.memory!.users.find(u => {
        const uDigits = String(u.phone || '').replace(/[^0-9]/g, '');
        const uNorm = uDigits.startsWith('8801') && uDigits.length === 13 ? uDigits.slice(2) : uDigits;
        return uNorm === normalized;
      });
    }

    const res = await this.pool.query(
      `SELECT * FROM users
       WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') IN ($1, $2)
       LIMIT 1`,
      [normalized, `88${normalized}`]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  }

  public async getUserById(id: string): Promise<User | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.users.find(u => u.id === id);
    }
    const res = await this.pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  }

  public async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.users.find(u => u.firebase_uid === uid);
    }
    const res = await this.pool.query(
      `SELECT * FROM users WHERE firebase_uid = $1 LIMIT 1`,
      [uid]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  }

  public async upsertGoogleUser(googleData: {
    email: string;
    name: string;
    uid: string;
    avatar_url?: string;
  }): Promise<User> {
    await this.ensureReady();
    const emailNormalized = googleData.email.toLowerCase().trim();
    const now = new Date().toISOString();

    if (!this.pool) {
      const existing = this.memory!.users.find(
        u => u.firebase_uid === googleData.uid || u.email.toLowerCase() === emailNormalized
      );
      const isAdminUser = emailNormalized === 'rakib504254@gmail.com' || existing?.role === 'admin';

      if (existing) {
        existing.firebase_uid = googleData.uid;
        if (googleData.avatar_url) existing.avatar_url = googleData.avatar_url;
        if (googleData.name && (!existing.name || existing.name === 'User')) existing.name = googleData.name;
        if (isAdminUser) {
          existing.role = 'admin';
          existing.usage_limit = Math.max(existing.usage_limit, 1000000);
        }
        existing.last_login_at = now;
        existing.updated_at = now;
        return existing;
      }

      const newUser: User = {
        id: `usr_${crypto.randomUUID().slice(0, 8)}`,
        email: emailNormalized,
        password_hash: '',
        name: googleData.name || emailNormalized.split('@')[0],
        phone: '',
        role: isAdminUser ? 'admin' : 'user',
        status: 'active',
        usage_limit: isAdminUser ? 1000000 : 0,
        current_usage: 0,
        firebase_uid: googleData.uid,
        avatar_url: googleData.avatar_url || '',
        last_login_at: now,
        created_at: now,
        updated_at: now
      };
      this.memory!.users.push(newUser);

      if (isAdminUser) {
        const futureYearly = calculateExpiryDate('yearly').toISOString();
        this.memory!.subscriptions.push({
          id: `sub_admin_${newUser.id}`,
          user_id: newUser.id,
          plan_id: 'yearly',
          plan_name: 'Admin Enterprise Plan',
          amount: 5999,
          currency: 'BDT',
          status: 'active',
          started_at: now,
          expires_at: futureYearly,
          auto_renew: true,
          payment_method: 'system',
          trx_id: `SYS_GOOGLE_ADMIN_${googleData.uid.slice(0, 8)}`,
          created_at: now,
          updated_at: now
        });
      }
      return newUser;
    }

    const existingRes = await this.pool.query(
      `SELECT * FROM users WHERE firebase_uid = $1 OR LOWER(email) = $2 LIMIT 1`,
      [googleData.uid, emailNormalized]
    );

    const existing = existingRes.rows[0] ? mapUserRow(existingRes.rows[0]) : undefined;
    const isAdminUser = emailNormalized === 'rakib504254@gmail.com' || existing?.role === 'admin';

    if (existing) {
      const nextAvatar = googleData.avatar_url || existing.avatar_url || '';
      const nextName = googleData.name && (!existing.name || existing.name === 'User') ? googleData.name : existing.name;
      const nextRole = isAdminUser ? 'admin' : existing.role;
      const nextLimit = isAdminUser ? Math.max(existing.usage_limit, 1000000) : existing.usage_limit;

      const updatedRes = await this.pool.query(
        `UPDATE users
         SET firebase_uid = $1,
             avatar_url = $2,
             name = $3,
             role = $4,
             usage_limit = $5,
             last_login_at = $6,
             updated_at = $6
         WHERE id = $7
         RETURNING *`,
        [googleData.uid, nextAvatar, nextName, nextRole, nextLimit, now, existing.id]
      );
      return mapUserRow(updatedRes.rows[0]);
    }

    const newUserId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const insertRes = await this.pool.query(
      `INSERT INTO users (
        id, email, password_hash, name, phone, role, status, usage_limit, current_usage,
        firebase_uid, avatar_url, last_login_at, created_at, updated_at
      ) VALUES ($1,$2,'',$3,'',$4,'active',$5,0,$6,$7,$8,$8,$8)
      ON CONFLICT (email) DO UPDATE SET
        firebase_uid = EXCLUDED.firebase_uid,
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url),
        last_login_at = EXCLUDED.last_login_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        newUserId,
        emailNormalized,
        googleData.name || emailNormalized.split('@')[0],
        isAdminUser ? 'admin' : 'user',
        isAdminUser ? 1000000 : 0,
        googleData.uid,
        googleData.avatar_url || '',
        now
      ]
    );
    const createdUser = mapUserRow(insertRes.rows[0]);

    if (isAdminUser) {
      const futureYearly = calculateExpiryDate('yearly').toISOString();
      await this.pool.query(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, plan_name, amount, currency, status, started_at, expires_at,
          auto_renew, payment_method, trx_id, created_at, updated_at
        ) VALUES ($1,$2,'yearly','Admin Enterprise Plan',5999,'BDT','active',$3,$4,true,'system',$5,$3,$3)
        ON CONFLICT (id) DO NOTHING`,
        [
          `sub_admin_${createdUser.id}`,
          createdUser.id,
          now,
          futureYearly,
          `SYS_GOOGLE_ADMIN_${googleData.uid.slice(0, 8)}`
        ]
      );
    }

    return createdUser;
  }

  public async createUser(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'user' | 'admin';
  }): Promise<User> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const newUser: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: userData.email.toLowerCase().trim(),
      password_hash: userData.password ? hashPassword(userData.password) : '',
      name: userData.name,
      phone: userData.phone || '',
      role: userData.role || 'user',
      status: 'active',
      usage_limit: userData.role === 'admin' ? 1000000 : 0,
      current_usage: 0,
      created_at: now,
      updated_at: now
    };

    if (!this.pool) {
      this.memory!.users.push(newUser);
      return newUser;
    }

    const res = await this.pool.query(
      `INSERT INTO users (
        id, email, password_hash, name, phone, role, status, usage_limit, current_usage, avatar_url, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'',$10,$11)
      RETURNING *`,
      [
        newUser.id,
        newUser.email,
        newUser.password_hash,
        newUser.name,
        newUser.phone,
        newUser.role,
        newUser.status,
        newUser.usage_limit,
        newUser.current_usage,
        now,
        now
      ]
    );
    return mapUserRow(res.rows[0]);
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await this.ensureReady();
    const now = new Date().toISOString();

    if (!this.pool) {
      const user = this.memory!.users.find(u => u.id === id);
      if (!user) return undefined;
      Object.assign(user, updates, { updated_at: now });
      return user;
    }

    const existing = await this.getUserById(id);
    if (!existing) return undefined;

    const merged: User = {
      ...existing,
      ...updates,
      updated_at: now
    };

    const res = await this.pool.query(
      `UPDATE users
       SET email = $1,
           password_hash = $2,
           name = $3,
           phone = $4,
           role = $5,
           status = $6,
           usage_limit = $7,
           current_usage = $8,
           firebase_uid = $9,
           avatar_url = $10,
           reset_token = $11,
           reset_token_expires_at = $12,
           last_login_at = $13,
           updated_at = $14
       WHERE id = $15
       RETURNING *`,
      [
        merged.email,
        merged.password_hash,
        merged.name,
        merged.phone,
        merged.role,
        merged.status,
        merged.usage_limit,
        merged.current_usage,
        merged.firebase_uid || null,
        merged.avatar_url || '',
        merged.reset_token ?? null,
        merged.reset_token_expires_at ?? null,
        merged.last_login_at ?? null,
        now,
        id
      ]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  }

  public async deleteUser(id: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.pool) {
      const initialLen = this.memory!.users.length;
      this.memory!.users = this.memory!.users.filter(u => u.id !== id);
      this.memory!.subscriptions = this.memory!.subscriptions.filter(s => s.user_id !== id);
      this.memory!.chats = this.memory!.chats.filter(c => c.user_id !== id);
      return this.memory!.users.length < initialLen;
    }

    const res = await this.pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async listUsers(search?: string, role?: string, status?: string): Promise<User[]> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.users.filter(u => {
        if (role && u.role !== role) return false;
        if (status && u.status !== status) return false;
        if (search) {
          const q = search.toLowerCase();
          return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
        }
        return true;
      });
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR phone LIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(
      `SELECT * FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    return res.rows.map(mapUserRow);
  }

  // --- Subscriptions ---
  public async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.subscriptions
        .filter(s => s.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    const res = await this.pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return res.rows[0] ? mapSubscriptionRow(res.rows[0]) : undefined;
  }

  public async createOrRenewSubscription(params: {
    userId: string;
    planId: 'monthly' | 'yearly';
    paymentMethod: string;
    trxId: string;
    senderNumber?: string;
  }): Promise<{ subscription: Subscription; payment: Payment }> {
    await this.ensureReady();
    const plan = PLANS[params.planId];
    const now = new Date().toISOString();

    if (!this.pool) {
      const user = this.memory!.users.find(u => u.id === params.userId);
      const existing = await this.getSubscriptionByUserId(params.userId);
      const expiresAt = calculateExpiryDate(
        params.planId,
        existing && existing.status === 'active' ? existing.expires_at : null
      ).toISOString();

      const subId = `sub_${crypto.randomUUID().slice(0, 8)}`;
      const newSub: Subscription = {
        id: subId,
        user_id: params.userId,
        plan_id: params.planId,
        plan_name: plan.name,
        amount: plan.priceBDT,
        currency: 'BDT',
        status: 'active',
        started_at: now,
        expires_at: expiresAt,
        auto_renew: true,
        payment_method: params.paymentMethod,
        trx_id: params.trxId,
        created_at: now,
        updated_at: now
      };

      this.memory!.subscriptions = this.memory!.subscriptions.filter(s => s.user_id !== params.userId);
      this.memory!.subscriptions.push(newSub);

      const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`;
      const newPayment: Payment = {
        id: paymentId,
        user_id: params.userId,
        user_name: user?.name,
        user_email: user?.email,
        subscription_id: subId,
        plan_id: params.planId,
        plan_name: plan.name,
        amount: plan.priceBDT,
        currency: 'BDT',
        gateway: params.paymentMethod as any,
        trx_id: params.trxId,
        sender_number: params.senderNumber || user?.phone || '',
        phone: params.senderNumber || user?.phone || '',
        status: 'completed',
        created_at: now
      };
      this.memory!.payments.push(newPayment);

      if (user) {
        user.current_usage = 0;
        user.usage_limit = params.planId === 'yearly' ? 15000000 : 1000000;
        user.updated_at = now;
      }

      return { subscription: newSub, payment: newPayment };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [params.userId]);
      const user = userRes.rows[0] ? mapUserRow(userRes.rows[0]) : undefined;

      const subRes = await client.query(
        `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [params.userId]
      );
      const existing = subRes.rows[0] ? mapSubscriptionRow(subRes.rows[0]) : undefined;

      const expiresAt = calculateExpiryDate(
        params.planId,
        existing && existing.status === 'active' ? existing.expires_at : null
      ).toISOString();

      const subId = `sub_${crypto.randomUUID().slice(0, 8)}`;
      await client.query(`DELETE FROM subscriptions WHERE user_id = $1`, [params.userId]);

      const insertedSubRes = await client.query(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, plan_name, amount, currency, status, started_at, expires_at,
          auto_renew, payment_method, trx_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,'BDT','active',$6,$7,true,$8,$9,$6,$6)
        RETURNING *`,
        [subId, params.userId, params.planId, plan.name, plan.priceBDT, now, expiresAt, params.paymentMethod, params.trxId]
      );

      const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`;
      const senderNum = params.senderNumber || user?.phone || '';
      const insertedPayRes = await client.query(
        `INSERT INTO payments (
          id, user_id, user_name, user_email, subscription_id, plan_id, plan_name, amount, currency,
          gateway, trx_id, sender_number, phone, status, created_at, approved_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BDT',$9,$10,$11,$11,'completed',$12,$12)
        RETURNING *`,
        [
          paymentId,
          params.userId,
          user?.name || null,
          user?.email || null,
          subId,
          params.planId,
          plan.name,
          plan.priceBDT,
          params.paymentMethod,
          params.trxId,
          senderNum,
          now
        ]
      );

      if (user) {
        const nextLimit = params.planId === 'yearly' ? 15000000 : 1000000;
        await client.query(
          `UPDATE users SET current_usage = 0, usage_limit = $1, updated_at = $2 WHERE id = $3`,
          [nextLimit, now, user.id]
        );
      }

      await client.query('COMMIT');
      return {
        subscription: mapSubscriptionRow(insertedSubRes.rows[0]),
        payment: mapPaymentRow(insertedPayRes.rows[0])
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    await this.ensureReady();
    const now = new Date().toISOString();

    if (!this.pool) {
      const sub = this.memory!.subscriptions.find(s => s.id === id);
      if (!sub) return undefined;
      Object.assign(sub, updates, { updated_at: now });
      return sub;
    }

    const existingRes = await this.pool.query(`SELECT * FROM subscriptions WHERE id = $1 LIMIT 1`, [id]);
    if (!existingRes.rows[0]) return undefined;
    const merged = { ...mapSubscriptionRow(existingRes.rows[0]), ...updates, updated_at: now };

    const res = await this.pool.query(
      `UPDATE subscriptions
       SET plan_id = $1,
           plan_name = $2,
           amount = $3,
           status = $4,
           started_at = $5,
           expires_at = $6,
           auto_renew = $7,
           payment_method = $8,
           trx_id = $9,
           updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        merged.plan_id,
        merged.plan_name,
        merged.amount,
        merged.status,
        merged.started_at,
        merged.expires_at,
        merged.auto_renew,
        merged.payment_method,
        merged.trx_id,
        now,
        id
      ]
    );
    return res.rows[0] ? mapSubscriptionRow(res.rows[0]) : undefined;
  }

  public async createPendingPayment(params: {
    userId: string;
    planId: 'monthly' | 'yearly';
    gateway: 'bkash' | 'nagad' | 'rocket';
    trxId: string;
    senderNumber: string;
  }): Promise<Payment> {
    await this.ensureReady();
    const cleanTrx = params.trxId.trim().toUpperCase();
    const plan = PLANS[params.planId];
    const now = new Date().toISOString();

    if (!this.pool) {
      const existing = this.memory!.payments.find(
        p => p.trx_id.toUpperCase() === cleanTrx && (p.status === 'completed' || p.status === 'pending')
      );
      if (existing) {
        if (existing.status === 'completed') {
          throw new Error('This Transaction ID (TrxID) has already been approved and redeemed.');
        }
        throw new Error('This Transaction ID (TrxID) is already submitted and pending admin verification.');
      }

      const user = this.memory!.users.find(u => u.id === params.userId);
      const newPayment: Payment = {
        id: `pay_${crypto.randomUUID().slice(0, 8)}`,
        user_id: params.userId,
        user_name: user?.name || 'User',
        user_email: user?.email || '',
        plan_id: params.planId,
        plan_name: plan.name,
        amount: plan.priceBDT,
        currency: 'BDT',
        gateway: params.gateway,
        trx_id: cleanTrx,
        sender_number: params.senderNumber.trim(),
        status: 'pending',
        created_at: now
      };
      this.memory!.payments.unshift(newPayment);
      return newPayment;
    }

    const dupRes = await this.pool.query(
      `SELECT status FROM payments WHERE UPPER(trx_id) = $1 AND status IN ('completed', 'pending') LIMIT 1`,
      [cleanTrx]
    );
    if (dupRes.rows[0]) {
      if (dupRes.rows[0].status === 'completed') {
        throw new Error('This Transaction ID (TrxID) has already been approved and redeemed.');
      }
      throw new Error('This Transaction ID (TrxID) is already submitted and pending admin verification.');
    }

    const user = await this.getUserById(params.userId);
    const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`;
    const res = await this.pool.query(
      `INSERT INTO payments (
        id, user_id, user_name, user_email, plan_id, plan_name, amount, currency,
        gateway, trx_id, sender_number, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'BDT',$8,$9,$10,'pending',$11)
      RETURNING *`,
      [
        paymentId,
        params.userId,
        user?.name || 'User',
        user?.email || '',
        params.planId,
        plan.name,
        plan.priceBDT,
        params.gateway,
        cleanTrx,
        params.senderNumber.trim(),
        now
      ]
    );
    return mapPaymentRow(res.rows[0]);
  }

  public async approvePayment(paymentId: string, adminUserId: string): Promise<{ payment: Payment; subscription: Subscription }> {
    await this.ensureReady();
    const now = new Date().toISOString();

    if (!this.pool) {
      const payment = this.memory!.payments.find(p => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment record not found.');
      }
      payment.status = 'completed';
      payment.approved_at = now;
      payment.approved_by = adminUserId;

      const plan = PLANS[payment.plan_id || 'monthly'];
      const existingSub = await this.getSubscriptionByUserId(payment.user_id);
      const expiresAt = calculateExpiryDate(
        payment.plan_id || 'monthly',
        existingSub && existingSub.status === 'active' ? existingSub.expires_at : null
      ).toISOString();

      const subId = payment.subscription_id || `sub_${crypto.randomUUID().slice(0, 8)}`;
      payment.subscription_id = subId;

      const newSub: Subscription = {
        id: subId,
        user_id: payment.user_id,
        plan_id: payment.plan_id || 'monthly',
        plan_name: plan.name,
        amount: payment.amount,
        currency: 'BDT',
        status: 'active',
        started_at: now,
        expires_at: expiresAt,
        auto_renew: true,
        payment_method: payment.gateway,
        trx_id: payment.trx_id,
        created_at: now,
        updated_at: now
      };

      this.memory!.subscriptions = this.memory!.subscriptions.filter(s => s.user_id !== payment.user_id);
      this.memory!.subscriptions.push(newSub);

      const user = this.memory!.users.find(u => u.id === payment.user_id);
      if (user) {
        user.current_usage = 0;
        user.usage_limit = payment.plan_id === 'yearly' ? 15000000 : 1000000;
        user.updated_at = now;
      }

      return { payment, subscription: newSub };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const payRes = await client.query(`SELECT * FROM payments WHERE id = $1 LIMIT 1`, [paymentId]);
      if (!payRes.rows[0]) {
        throw new Error('Payment record not found.');
      }
      const payment = mapPaymentRow(payRes.rows[0]);
      const planKey = payment.plan_id || 'monthly';
      const plan = PLANS[planKey];

      const subRes = await client.query(
        `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [payment.user_id]
      );
      const existingSub = subRes.rows[0] ? mapSubscriptionRow(subRes.rows[0]) : undefined;
      const expiresAt = calculateExpiryDate(
        planKey,
        existingSub && existingSub.status === 'active' ? existingSub.expires_at : null
      ).toISOString();

      const subId = payment.subscription_id || `sub_${crypto.randomUUID().slice(0, 8)}`;

      const updatedPayRes = await client.query(
        `UPDATE payments
         SET status = 'completed',
             approved_at = $1,
             approved_by = $2,
             subscription_id = $3
         WHERE id = $4
         RETURNING *`,
        [now, adminUserId, subId, paymentId]
      );

      await client.query(`DELETE FROM subscriptions WHERE user_id = $1`, [payment.user_id]);
      const insertedSubRes = await client.query(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, plan_name, amount, currency, status, started_at, expires_at,
          auto_renew, payment_method, trx_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,'BDT','active',$6,$7,true,$8,$9,$6,$6)
        RETURNING *`,
        [subId, payment.user_id, planKey, plan.name, payment.amount, now, expiresAt, payment.gateway, payment.trx_id]
      );

      const nextLimit = planKey === 'yearly' ? 15000000 : 1000000;
      await client.query(
        `UPDATE users SET current_usage = 0, usage_limit = $1, updated_at = $2 WHERE id = $3`,
        [nextLimit, now, payment.user_id]
      );

      await client.query('COMMIT');
      return {
        payment: mapPaymentRow(updatedPayRes.rows[0]),
        subscription: mapSubscriptionRow(insertedSubRes.rows[0])
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async rejectPayment(paymentId: string, adminUserId: string, note?: string): Promise<Payment> {
    await this.ensureReady();
    const adminNote = note || 'Payment verification failed: TrxID or phone number mismatch';

    if (!this.pool) {
      const payment = this.memory!.payments.find(p => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment record not found.');
      }
      payment.status = 'rejected';
      payment.admin_note = adminNote;
      payment.approved_by = adminUserId;
      return payment;
    }

    const res = await this.pool.query(
      `UPDATE payments
       SET status = 'rejected',
           admin_note = $1,
           approved_by = $2
       WHERE id = $3
       RETURNING *`,
      [adminNote, adminUserId, paymentId]
    );
    if (!res.rows[0]) {
      throw new Error('Payment record not found.');
    }
    return mapPaymentRow(res.rows[0]);
  }

  public async getPaymentById(id: string): Promise<Payment | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.payments.find(p => p.id === id);
    }
    const res = await this.pool.query(`SELECT * FROM payments WHERE id = $1 LIMIT 1`, [id]);
    return res.rows[0] ? mapPaymentRow(res.rows[0]) : undefined;
  }

  public async listAllPayments(): Promise<Payment[]> {
    await this.ensureReady();
    if (!this.pool) {
      return [...this.memory!.payments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    const res = await this.pool.query(`SELECT * FROM payments ORDER BY created_at DESC`);
    return res.rows.map(mapPaymentRow);
  }

  public async listPayments(userId?: string): Promise<Payment[]> {
    await this.ensureReady();
    if (!this.pool) {
      if (userId) {
        return this.memory!.payments.filter(p => p.user_id === userId);
      }
      return this.memory!.payments;
    }
    if (userId) {
      const res = await this.pool.query(
        `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return res.rows.map(mapPaymentRow);
    }
    return this.listAllPayments();
  }

  // --- Chats & Messages ---
  public async listChats(userId: string): Promise<Chat[]> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.chats
        .filter(c => c.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    const res = await this.pool.query(
      `SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return res.rows.map(mapChatRow);
  }

  public async getChat(id: string, userId: string): Promise<Chat | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.chats.find(c => c.id === id && c.user_id === userId);
    }
    const res = await this.pool.query(
      `SELECT * FROM chats WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    return res.rows[0] ? mapChatRow(res.rows[0]) : undefined;
  }

  public async createChat(userId: string, title: string, modelId: string): Promise<Chat> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const chat: Chat = {
      id: `chat_${crypto.randomUUID().slice(0, 8)}`,
      user_id: userId,
      title: title || 'New Chat',
      model_id: modelId,
      pinned: false,
      created_at: now,
      updated_at: now
    };

    if (!this.pool) {
      this.memory!.chats.unshift(chat);
      return chat;
    }

    const res = await this.pool.query(
      `INSERT INTO chats (id, user_id, title, model_id, pinned, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [chat.id, chat.user_id, chat.title, chat.model_id, chat.pinned, now, now]
    );
    return mapChatRow(res.rows[0]);
  }

  public async updateChat(id: string, userId: string, updates: Partial<Chat>): Promise<Chat | undefined> {
    await this.ensureReady();
    const now = new Date().toISOString();

    if (!this.pool) {
      const chat = this.memory!.chats.find(c => c.id === id && c.user_id === userId);
      if (!chat) return undefined;
      Object.assign(chat, updates, { updated_at: now });
      return chat;
    }

    const existing = await this.getChat(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...updates, updated_at: now };

    const res = await this.pool.query(
      `UPDATE chats
       SET title = $1,
           model_id = $2,
           pinned = $3,
           updated_at = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [merged.title, merged.model_id, merged.pinned, now, id, userId]
    );
    return res.rows[0] ? mapChatRow(res.rows[0]) : undefined;
  }

  public async deleteChat(id: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.pool) {
      const chat = this.memory!.chats.find(c => c.id === id && c.user_id === userId);
      if (!chat) return false;
      this.memory!.chats = this.memory!.chats.filter(c => c.id !== id);
      this.memory!.messages = this.memory!.messages.filter(m => m.chat_id !== id);
      return true;
    }

    const res = await this.pool.query(
      `DELETE FROM chats WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async getMessages(chatId: string): Promise<Message[]> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.messages
        .filter(m => m.chat_id === chatId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    const res = await this.pool.query(
      `SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );
    return res.rows.map(mapMessageRow);
  }

  public async addMessage(
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    modelId: string,
    tokensUsed: number = 0,
    attachments?: ChatAttachment[]
  ): Promise<Message> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const msg: Message = {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      chat_id: chatId,
      role,
      content,
      model_id: modelId,
      tokens_used: tokensUsed,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      created_at: now
    };

    if (!this.pool) {
      this.memory!.messages.push(msg);
      const chat = this.memory!.chats.find(c => c.id === chatId);
      if (chat) {
        chat.updated_at = now;
        if ((chat.title === 'New Chat' || chat.title === 'New Conversation' || chat.title === 'নতুন চ্যাট') && role === 'user') {
          const titleSource = content.trim() || attachments?.[0]?.name || 'New Chat';
          chat.title = titleSource.slice(0, 36) + (titleSource.length > 36 ? '...' : '');
        }
      }
      return msg;
    }

    const res = await this.pool.query(
      `INSERT INTO messages (id, chat_id, role, content, model_id, tokens_used, attachments, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        msg.id,
        chatId,
        role,
        content,
        modelId,
        tokensUsed,
        attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
        now
      ]
    );

    const chatRes = await this.pool.query(`SELECT title FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
    const currentTitle = chatRes.rows[0]?.title;
    if (currentTitle !== undefined) {
      let nextTitle = currentTitle;
      if ((currentTitle === 'New Chat' || currentTitle === 'New Conversation' || currentTitle === 'নতুন চ্যাট') && role === 'user') {
        const titleSource = content.trim() || attachments?.[0]?.name || 'New Chat';
        nextTitle = titleSource.slice(0, 36) + (titleSource.length > 36 ? '...' : '');
      }
      await this.pool.query(
        `UPDATE chats SET title = $1, updated_at = $2 WHERE id = $3`,
        [nextTitle, now, chatId]
      );
    }

    return mapMessageRow(res.rows[0]);
  }

  // --- AI Providers & Models (API Keys persisted in admin_settings + ai_providers) ---
  public async listProviders(): Promise<AiProvider[]> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.ai_providers.map(p => this.hydrateMemoryProvider(p));
    }

    const [provRes, keyMap] = await Promise.all([
      this.pool.query(`SELECT * FROM ai_providers ORDER BY created_at ASC`),
      this.readProviderKeySettings()
    ]);
    return provRes.rows.map(r => mapProviderRow(r, keyMap, this.env));
  }

  public async getProviderById(id: string): Promise<AiProvider | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      const found = this.memory!.ai_providers.find(p => p.id === id);
      return found ? this.hydrateMemoryProvider(found) : undefined;
    }

    const [provRes, keyMap] = await Promise.all([
      this.pool.query(`SELECT * FROM ai_providers WHERE id = $1 LIMIT 1`, [id]),
      this.readProviderKeySettings()
    ]);
    return provRes.rows[0] ? mapProviderRow(provRes.rows[0], keyMap, this.env) : undefined;
  }

  public async getProviderBySlug(slug: string): Promise<AiProvider | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      const found = this.memory!.ai_providers.find(p => p.slug === slug);
      return found ? this.hydrateMemoryProvider(found) : undefined;
    }

    const [provRes, keyMap] = await Promise.all([
      this.pool.query(`SELECT * FROM ai_providers WHERE slug = $1 LIMIT 1`, [slug]),
      this.readProviderKeySettings()
    ]);
    return provRes.rows[0] ? mapProviderRow(provRes.rows[0], keyMap, this.env) : undefined;
  }

  public async updateProvider(id: string, updates: Partial<AiProvider>): Promise<AiProvider | undefined> {
    await this.ensureReady();
    const now = new Date().toISOString();

    if (!this.pool) {
      const provider = this.memory!.ai_providers.find(p => p.id === id);
      if (!provider) return undefined;
      Object.assign(provider, updates, { updated_at: now });
      this.memory!.provider_api_keys[provider.slug] = {
        ...(this.memory!.provider_api_keys[provider.slug] || {}),
        ...(updates.api_key !== undefined ? { api_key: updates.api_key } : { api_key: provider.api_key }),
        ...(updates.base_url !== undefined ? { base_url: updates.base_url } : { base_url: provider.base_url }),
        ...(updates.is_active !== undefined ? { is_active: updates.is_active } : { is_active: provider.is_active }),
        updated_at: now
      };
      return this.hydrateMemoryProvider(provider);
    }

    const existingRes = await this.pool.query(`SELECT * FROM ai_providers WHERE id = $1 LIMIT 1`, [id]);
    if (!existingRes.rows[0]) return undefined;
    const rawExisting = existingRes.rows[0];
    const keyMap = await this.readProviderKeySettings();
    const slug = String(rawExisting.slug);
    const prevKeyEntry = keyMap[slug] || {};

    const nextApiKey =
      updates.api_key !== undefined
        ? updates.api_key
        : (prevKeyEntry.api_key ?? String(rawExisting.api_key || ''));
    const nextBaseUrl =
      updates.base_url !== undefined
        ? updates.base_url
        : (prevKeyEntry.base_url ?? String(rawExisting.base_url || ''));
    const nextIsActive =
      updates.is_active !== undefined
        ? Boolean(updates.is_active)
        : (prevKeyEntry.is_active !== undefined ? Boolean(prevKeyEntry.is_active) : Boolean(rawExisting.is_active));

    const updatedRes = await this.pool.query(
      `UPDATE ai_providers
       SET api_key = $1,
           base_url = $2,
           is_active = $3,
           updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [nextApiKey, nextBaseUrl, nextIsActive, now, id]
    );

    const nextKeyMap: Record<string, ProviderKeySettingEntry> = {
      ...keyMap,
      [slug]: {
        api_key: nextApiKey,
        base_url: nextBaseUrl,
        is_active: nextIsActive,
        updated_at: now
      }
    };
    await this.writeProviderKeySettings(nextKeyMap);

    return mapProviderRow(updatedRes.rows[0], nextKeyMap, this.env);
  }

  public async listModels(enabledOnly: boolean = false): Promise<AiModel[]> {
    await this.ensureReady();
    if (!this.pool) {
      let models = [...this.memory!.ai_models];
      if (enabledOnly) {
        models = models.filter(m => m.is_enabled);
      }
      return models.sort((a, b) => a.sort_order - b.sort_order);
    }

    const query = enabledOnly
      ? `SELECT * FROM ai_models WHERE is_enabled = TRUE ORDER BY sort_order ASC`
      : `SELECT * FROM ai_models ORDER BY sort_order ASC`;
    const res = await this.pool.query(query);
    return res.rows.map(mapModelRow);
  }

  public async getModelById(id: string): Promise<AiModel | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.ai_models.find(m => m.id === id);
    }
    const res = await this.pool.query(`SELECT * FROM ai_models WHERE id = $1 LIMIT 1`, [id]);
    return res.rows[0] ? mapModelRow(res.rows[0]) : undefined;
  }

  public async updateModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined> {
    await this.ensureReady();

    const applyNormalization = (existing: AiModel): AiModel => {
      const defaultName = (existing.default_name || existing.display_name || '').trim();
      const defaultDesc = (existing.default_description ?? existing.description_en ?? '').trim();
      const defaultIcon = normalizeBrandIconKey(existing.default_icon) || inferDefaultBrandIcon(existing);

      let nextCustomName = existing.custom_name ?? null;
      if (updates.custom_name !== undefined) {
        const raw = typeof updates.custom_name === 'string' ? updates.custom_name.trim() : '';
        nextCustomName = raw && raw !== defaultName ? raw : null;
      } else if (updates.display_name !== undefined) {
        const raw = typeof updates.display_name === 'string' ? updates.display_name.trim() : '';
        nextCustomName = raw && raw !== defaultName ? raw : null;
      }

      let nextCustomDesc = existing.custom_description ?? null;
      if (updates.custom_description !== undefined) {
        const raw = typeof updates.custom_description === 'string' ? updates.custom_description.trim() : '';
        nextCustomDesc = raw && raw !== defaultDesc ? raw : null;
      } else if (updates.description_en !== undefined) {
        const raw = typeof updates.description_en === 'string' ? updates.description_en.trim() : '';
        nextCustomDesc = raw && raw !== defaultDesc ? raw : null;
      }

      let nextCustomIcon = normalizeBrandIconKey(existing.custom_icon);
      if (updates.custom_icon !== undefined) {
        if (updates.custom_icon === null || updates.custom_icon === '') {
          nextCustomIcon = null;
        } else {
          const parsed = normalizeBrandIconKey(updates.custom_icon);
          nextCustomIcon = parsed && parsed !== defaultIcon ? parsed : null;
        }
      }

      const effectiveName = nextCustomName || defaultName;
      const effectiveDesc = nextCustomDesc || defaultDesc;

      return {
        ...existing,
        ...(updates.is_enabled !== undefined && { is_enabled: updates.is_enabled }),
        ...(updates.is_default !== undefined && { is_default: updates.is_default }),
        ...(updates.badge !== undefined && { badge: updates.badge }),
        ...(updates.sort_order !== undefined && { sort_order: updates.sort_order }),
        ...(updates.openrouter_model_id !== undefined && { openrouter_model_id: updates.openrouter_model_id }),
        default_name: defaultName,
        default_description: defaultDesc,
        default_icon: defaultIcon,
        custom_name: nextCustomName,
        custom_description: nextCustomDesc,
        custom_icon: nextCustomIcon,
        display_name: effectiveName,
        description_en: effectiveDesc
      };
    };

    if (!this.pool) {
      const idx = this.memory!.ai_models.findIndex(m => m.id === id);
      if (idx === -1) return undefined;
      const updated = applyNormalization(this.memory!.ai_models[idx]);
      this.memory!.ai_models[idx] = updated;
      return updated;
    }

    const existing = await this.getModelById(id);
    if (!existing) return undefined;
    const merged = applyNormalization(existing);

    const res = await this.pool.query(
      `UPDATE ai_models
       SET is_enabled = $1,
           is_default = $2,
           badge = $3,
           display_name = $4,
           openrouter_model_id = $5,
           description_en = $6,
           sort_order = $7,
           custom_name = $8,
           custom_description = $9,
           custom_icon = $10,
           default_name = $11,
           default_description = $12,
           default_icon = $13
       WHERE id = $14
       RETURNING *`,
      [
        merged.is_enabled,
        merged.is_default,
        merged.badge,
        merged.display_name,
        merged.openrouter_model_id || null,
        merged.description_en,
        merged.sort_order,
        merged.custom_name ?? null,
        merged.custom_description ?? null,
        merged.custom_icon ?? null,
        merged.default_name || merged.display_name,
        merged.default_description || merged.description_en,
        merged.default_icon || inferDefaultBrandIcon(merged),
        id
      ]
    );
    return res.rows[0] ? mapModelRow(res.rows[0]) : undefined;
  }

  public async resetModelCustomizations(id: string): Promise<AiModel | undefined> {
    await this.ensureReady();
    if (!this.pool) {
      const model = this.memory!.ai_models.find(m => m.id === id);
      if (!model) return undefined;
      const defaultName = (model.default_name || model.display_name || '').trim();
      const defaultDesc = (model.default_description || model.description_en || '').trim();
      const defaultIcon = normalizeBrandIconKey(model.default_icon) || inferDefaultBrandIcon(model);
      model.custom_name = null;
      model.custom_description = null;
      model.custom_icon = null;
      model.default_name = defaultName;
      model.default_description = defaultDesc;
      model.default_icon = defaultIcon;
      model.display_name = defaultName;
      model.description_en = defaultDesc;
      return model;
    }

    const res = await this.pool.query(
      `UPDATE ai_models
       SET custom_name = NULL,
           custom_description = NULL,
           custom_icon = NULL,
           display_name = CASE WHEN default_name <> '' THEN default_name ELSE display_name END,
           description_en = CASE WHEN default_description <> '' THEN default_description ELSE description_en END
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0] ? mapModelRow(res.rows[0]) : undefined;
  }

  public async resetAllModelCustomizations(): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      let count = 0;
      for (const model of this.memory!.ai_models) {
        const defaultName = (model.default_name || model.display_name || '').trim();
        const defaultDesc = (model.default_description || model.description_en || '').trim();
        const defaultIcon = normalizeBrandIconKey(model.default_icon) || inferDefaultBrandIcon(model);
        const hadCustom = Boolean(model.custom_name || model.custom_description || model.custom_icon);
        model.custom_name = null;
        model.custom_description = null;
        model.custom_icon = null;
        model.default_name = defaultName;
        model.default_description = defaultDesc;
        model.default_icon = defaultIcon;
        model.display_name = defaultName;
        model.description_en = defaultDesc;
        if (hadCustom) count++;
      }
      return count;
    }

    const res = await this.pool.query(
      `UPDATE ai_models
       SET custom_name = NULL,
           custom_description = NULL,
           custom_icon = NULL,
           display_name = CASE WHEN default_name <> '' THEN default_name ELSE display_name END,
           description_en = CASE WHEN default_description <> '' THEN default_description ELSE description_en END
       WHERE custom_name IS NOT NULL OR custom_description IS NOT NULL OR custom_icon IS NOT NULL`
    );
    return res.rowCount ?? 0;
  }

  public async addModels(newModels: AiModel[]): Promise<number> {
    await this.ensureReady();
    if (!newModels.length) return 0;

    if (!this.pool) {
      this.memory!.ai_models.push(...newModels);
      return newModels.length;
    }

    let inserted = 0;
    for (const mod of newModels) {
      const defName = mod.default_name || mod.display_name;
      const defDesc = mod.default_description || mod.description_en;
      const defIcon = mod.default_icon || inferDefaultBrandIcon(mod);
      const res = await this.pool.query(
        `INSERT INTO ai_models (
          id, provider_id, model_name, display_name, description_en,
          custom_name, default_name, custom_icon, default_icon, custom_description, default_description,
          badge, is_enabled, is_default, is_free, context_window, max_output_tokens,
          sort_order, openrouter_model_id, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        ON CONFLICT (id) DO NOTHING`,
        [
          mod.id, mod.provider_id, mod.model_name, mod.display_name, mod.description_en,
          mod.custom_name ?? null, defName, mod.custom_icon ?? null, defIcon, mod.custom_description ?? null, defDesc,
          mod.badge, mod.is_enabled, mod.is_default, Boolean(mod.is_free), mod.context_window, mod.max_output_tokens,
          mod.sort_order, mod.openrouter_model_id || null, mod.created_at
        ]
      );
      inserted += res.rowCount ?? 0;
    }
    return inserted;
  }

  public async bulkToggleFreeModels(enabled: boolean): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      let count = 0;
      for (const m of this.memory!.ai_models) {
        if (isFreeAiModel(m)) {
          m.is_enabled = enabled;
          count++;
        }
      }
      return count;
    }

    const res = await this.pool.query(
      `UPDATE ai_models
       SET is_enabled = $1
       WHERE is_free = TRUE OR badge = 'free' OR model_name LIKE '%:free' OR model_name = 'openrouter/free'`,
      [enabled]
    );
    return res.rowCount ?? 0;
  }

  public async bulkTogglePaidModels(enabled: boolean): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      let count = 0;
      for (const m of this.memory!.ai_models) {
        if (isPaidAiModel(m)) {
          m.is_enabled = enabled;
          count++;
        }
      }
      return count;
    }

    const res = await this.pool.query(
      `UPDATE ai_models
       SET is_enabled = $1
       WHERE COALESCE(is_free, FALSE) = FALSE
         AND COALESCE(badge, '') <> 'free'
         AND model_name NOT LIKE '%:free'
         AND model_name <> 'openrouter/free'`,
      [enabled]
    );
    return res.rowCount ?? 0;
  }

  // --- Usage Tracking ---
  public async recordUsage(
    userId: string,
    chatId: string | undefined,
    modelId: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<UsageRecord> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const totalTokens = promptTokens + completionTokens;
    const record: UsageRecord = {
      id: `usg_${crypto.randomUUID().slice(0, 8)}`,
      user_id: userId,
      chat_id: chatId,
      model_id: modelId,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      created_at: now
    };

    if (!this.pool) {
      this.memory!.usage_records.push(record);
      const user = this.memory!.users.find(u => u.id === userId);
      if (user) {
        user.current_usage = (user.current_usage || 0) + totalTokens;
        user.updated_at = now;
      }
      return record;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO usage_records (id, user_id, chat_id, model_id, prompt_tokens, completion_tokens, total_tokens, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [record.id, userId, chatId || null, modelId, promptTokens, completionTokens, totalTokens, now]
      );
      await client.query(
        `UPDATE users
         SET current_usage = COALESCE(current_usage, 0) + $1,
             updated_at = $2
         WHERE id = $3`,
        [totalTokens, now, userId]
      );
      await client.query('COMMIT');
      return mapUsageRow(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Admin Settings & Stats ---
  public async getSettings(): Promise<SystemSettings> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.settings;
    }

    const res = await this.pool.query(
      `SELECT setting_value FROM admin_settings WHERE setting_key = $1 LIMIT 1`,
      ['system_settings']
    );
    if (!res.rows[0]) {
      return createDefaultSystemSettings();
    }
    try {
      const merged: SystemSettings = {
        ...createDefaultSystemSettings(),
        ...JSON.parse(String(res.rows[0].setting_value))
      };
      if (merged.support_phone && merged.support_phone.replace(/\D/g, '').endsWith('1622860128')) {
        merged.support_phone = '+880 1878-242764';
      }
      return merged;
    } catch {
      return createDefaultSystemSettings();
    }
  }

  public async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    await this.ensureReady();
    if (!this.pool) {
      Object.assign(this.memory!.settings, updates);
      return this.memory!.settings;
    }

    const current = await this.getSettings();
    const merged: SystemSettings = { ...current, ...updates };
    await this.pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      ['system_settings', JSON.stringify(merged)]
    );
    return merged;
  }

  public async getAdminStats() {
    await this.ensureReady();
    if (!this.pool) {
      const totalUsers = this.memory!.users.length;
      const now = Date.now();
      const activeSubscribers = this.memory!.subscriptions.filter(
        s => s.status === 'active' && new Date(s.expires_at).getTime() > now
      ).length;
      const totalRevenue = this.memory!.payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const totalTokensUsed = this.memory!.usage_records.reduce((sum, r) => sum + r.total_tokens, 0);

      const modelUsageMap: Record<string, number> = {};
      for (const r of this.memory!.usage_records) {
        modelUsageMap[r.model_id] = (modelUsageMap[r.model_id] || 0) + r.total_tokens;
      }

      const pendingPaymentsCount = this.memory!.payments.filter(p => p.status === 'pending').length;

      return {
        totalUsers,
        activeSubscribers,
        totalRevenue,
        totalTokensUsed,
        modelUsageMap,
        totalChats: this.memory!.chats.length,
        totalMessages: this.memory!.messages.length,
        pendingPaymentsCount
      };
    }

    const [
      usersCountRes,
      activeSubRes,
      revenueRes,
      usageRes,
      modelUsageRes,
      chatsCountRes,
      messagesCountRes,
      pendingPayRes
    ] = await Promise.all([
      this.pool.query(`SELECT COUNT(*)::int AS cnt FROM users`),
      this.pool.query(`SELECT COUNT(*)::int AS cnt FROM subscriptions WHERE status = 'active' AND expires_at > NOW()`),
      this.pool.query(`SELECT COALESCE(SUM(amount), 0)::double precision AS total FROM payments WHERE status = 'completed'`),
      this.pool.query(`SELECT COALESCE(SUM(total_tokens), 0)::bigint AS total FROM usage_records`),
      this.pool.query(`SELECT model_id, COALESCE(SUM(total_tokens), 0)::bigint AS tokens FROM usage_records GROUP BY model_id`),
      this.pool.query(`SELECT COUNT(*)::int AS cnt FROM chats`),
      this.pool.query(`SELECT COUNT(*)::int AS cnt FROM messages`),
      this.pool.query(`SELECT COUNT(*)::int AS cnt FROM payments WHERE status = 'pending'`)
    ]);

    const modelUsageMap: Record<string, number> = {};
    for (const row of modelUsageRes.rows) {
      modelUsageMap[String(row.model_id)] = Number(row.tokens ?? 0);
    }

    return {
      totalUsers: Number(usersCountRes.rows[0]?.cnt ?? 0),
      activeSubscribers: Number(activeSubRes.rows[0]?.cnt ?? 0),
      totalRevenue: Number(revenueRes.rows[0]?.total ?? 0),
      totalTokensUsed: Number(usageRes.rows[0]?.total ?? 0),
      modelUsageMap,
      totalChats: Number(chatsCountRes.rows[0]?.cnt ?? 0),
      totalMessages: Number(messagesCountRes.rows[0]?.cnt ?? 0),
      pendingPaymentsCount: Number(pendingPayRes.rows[0]?.cnt ?? 0)
    };
  }

  // --- Isolated Admin Finance Ledger (Money Management) ---
  public async listFinanceLedgerEntries(): Promise<FinanceLedgerEntry[]> {
    await this.ensureReady();
    if (!this.pool) {
      return [...this.memory!.finance_ledger].sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.createdAt.localeCompare(a.createdAt);
      });
    }

    const res = await this.pool.query(
      `SELECT * FROM admin_finance_ledger ORDER BY entry_date DESC, created_at DESC`
    );
    return res.rows.map(mapFinanceLedgerRow);
  }

  public async upsertFinanceLedgerEntry(entry: FinanceLedgerEntry): Promise<FinanceLedgerEntry> {
    await this.ensureReady();
    if (!this.pool) {
      const idx = this.memory!.finance_ledger.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        this.memory!.finance_ledger[idx] = entry;
      } else {
        this.memory!.finance_ledger.unshift(entry);
      }
      return entry;
    }

    const res = await this.pool.query(
      `INSERT INTO admin_finance_ledger (
        id, type, category, title, note, amount_bdt, entry_date, deleted_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        note = EXCLUDED.note,
        amount_bdt = EXCLUDED.amount_bdt,
        entry_date = EXCLUDED.entry_date,
        deleted_at = EXCLUDED.deleted_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        entry.id,
        entry.type,
        entry.category,
        entry.title,
        entry.note,
        entry.amountBDT,
        entry.date,
        entry.deletedAt,
        entry.createdAt,
        entry.updatedAt
      ]
    );
    return mapFinanceLedgerRow(res.rows[0]);
  }

  public async bulkUpsertFinanceLedgerEntries(entries: FinanceLedgerEntry[]): Promise<number> {
    await this.ensureReady();
    if (!entries.length) return 0;

    if (!this.pool) {
      const map = new Map(this.memory!.finance_ledger.map(e => [e.id, e]));
      for (const item of entries) {
        map.set(item.id, item);
      }
      this.memory!.finance_ledger = Array.from(map.values());
      return entries.length;
    }

    let count = 0;
    for (const entry of entries) {
      await this.upsertFinanceLedgerEntry(entry);
      count++;
    }
    return count;
  }

  public async deleteFinanceLedgerEntry(id: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.pool) {
      const prev = this.memory!.finance_ledger.length;
      this.memory!.finance_ledger = this.memory!.finance_ledger.filter(e => e.id !== id);
      return this.memory!.finance_ledger.length < prev;
    }
    const res = await this.pool.query(`DELETE FROM admin_finance_ledger WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async emptyFinanceLedgerTrash(): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      const prev = this.memory!.finance_ledger.length;
      this.memory!.finance_ledger = this.memory!.finance_ledger.filter(e => e.deletedAt === null);
      return prev - this.memory!.finance_ledger.length;
    }
    const res = await this.pool.query(`DELETE FROM admin_finance_ledger WHERE deleted_at IS NOT NULL`);
    return res.rowCount ?? 0;
  }

  public async resetFinanceLedger(): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      const count = this.memory!.finance_ledger.length;
      this.memory!.finance_ledger = [];
      return count;
    }
    const res = await this.pool.query(`DELETE FROM admin_finance_ledger`);
    return res.rowCount ?? 0;
  }

  // --- Per-Page Dynamic SEO Configurations ---
  public async listPageSeoConfigs(): Promise<PageSeoConfig[]> {
    await this.ensureReady();
    if (!this.pool) {
      return sortPageSeoConfigs(
        this.memory!.page_seo_configs.map(cfg => ({
          ...cfg,
          faqItems: cfg.faqItems.map(item => ({ ...item }))
        }))
      );
    }

    const res = await this.pool.query(`SELECT * FROM page_seo_configs`);
    return sortPageSeoConfigs(res.rows.map(mapPageSeoRow));
  }

  public async getPageSeoConfigBySlug(slug: string): Promise<PageSeoConfig | undefined> {
    await this.ensureReady();
    const normalized = normalizePageSlug(slug);
    if (!this.pool) {
      const found = this.memory!.page_seo_configs.find(c => c.slug === normalized);
      return found
        ? { ...found, faqItems: found.faqItems.map(item => ({ ...item })) }
        : undefined;
    }

    const res = await this.pool.query(
      `SELECT * FROM page_seo_configs WHERE slug = $1 LIMIT 1`,
      [normalized]
    );
    return res.rows[0] ? mapPageSeoRow(res.rows[0]) : undefined;
  }

  public async upsertPageSeoConfig(config: PageSeoConfig): Promise<PageSeoConfig> {
    await this.ensureReady();
    const normalized = normalizePageSlug(config.slug);
    const now = config.updatedAt || new Date().toISOString();
    const record: PageSeoConfig = {
      ...config,
      slug: normalized,
      faqItems: config.faqItems.map(item => ({ ...item })),
      updatedAt: now
    };

    if (!this.pool) {
      const idx = this.memory!.page_seo_configs.findIndex(c => c.slug === normalized);
      if (idx >= 0) {
        this.memory!.page_seo_configs[idx] = record;
      } else {
        this.memory!.page_seo_configs.push(record);
      }
      return { ...record, faqItems: record.faqItems.map(item => ({ ...item })) };
    }

    const res = await this.pool.query(
      `INSERT INTO page_seo_configs (
        slug, page_label, meta_title, meta_description, focus_keyword, og_image_url,
        twitter_card, twitter_title, twitter_description, twitter_handle, canonical_override,
        no_index, no_follow, faq_schema_enabled, faq_items, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (slug) DO UPDATE SET
        page_label = EXCLUDED.page_label,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        focus_keyword = EXCLUDED.focus_keyword,
        og_image_url = EXCLUDED.og_image_url,
        twitter_card = EXCLUDED.twitter_card,
        twitter_title = EXCLUDED.twitter_title,
        twitter_description = EXCLUDED.twitter_description,
        twitter_handle = EXCLUDED.twitter_handle,
        canonical_override = EXCLUDED.canonical_override,
        no_index = EXCLUDED.no_index,
        no_follow = EXCLUDED.no_follow,
        faq_schema_enabled = EXCLUDED.faq_schema_enabled,
        faq_items = EXCLUDED.faq_items,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        record.slug,
        record.pageLabel,
        record.metaTitle,
        record.metaDescription,
        record.focusKeyword,
        record.ogImageUrl,
        record.twitterCard,
        record.twitterTitle,
        record.twitterDescription,
        record.twitterHandle,
        record.canonicalOverride,
        record.noIndex,
        record.noFollow,
        record.faqSchemaEnabled,
        JSON.stringify(record.faqItems),
        now
      ]
    );
    return mapPageSeoRow(res.rows[0]);
  }

  public async deletePageSeoConfig(slug: string): Promise<boolean> {
    await this.ensureReady();
    const normalized = normalizePageSlug(slug);
    if (!this.pool) {
      const prev = this.memory!.page_seo_configs.length;
      this.memory!.page_seo_configs = this.memory!.page_seo_configs.filter(
        c => c.slug !== normalized
      );
      return this.memory!.page_seo_configs.length < prev;
    }

    const res = await this.pool.query(
      `DELETE FROM page_seo_configs WHERE slug = $1`,
      [normalized]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async resetPageSeoConfig(slug: string): Promise<PageSeoConfig | undefined> {
    await this.ensureReady();
    const normalized = normalizePageSlug(slug);
    const preset = getDefaultPresetForSlug(normalized);
    if (preset) {
      return this.upsertPageSeoConfig({
        ...preset,
        updatedAt: new Date().toISOString()
      });
    }
    const existing = await this.getPageSeoConfigBySlug(normalized);
    if (!existing) return undefined;
    return this.upsertPageSeoConfig({
      slug: normalized,
      pageLabel: existing.pageLabel || derivePageLabelFromSlug(normalized),
      metaTitle: '',
      metaDescription: '',
      focusKeyword: 'bangla ai',
      ogImageUrl: DEFAULT_OG_IMAGE_PATH,
      twitterCard: 'summary_large_image',
      twitterTitle: '',
      twitterDescription: '',
      twitterHandle: '@banglaaipro',
      canonicalOverride: '',
      noIndex: false,
      noFollow: false,
      faqSchemaEnabled: false,
      faqItems: [],
      updatedAt: new Date().toISOString()
    });
  }

  // --- Persistent User Memories ---
  public async listUserMemories(userId: string): Promise<UserMemory[]> {
    await this.ensureReady();
    if (!this.pool) {
      return this.memory!.user_memories
        .filter(m => m.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, MAX_MEMORIES_PER_USER)
        .map(m => ({ ...m }));
    }

    const res = await this.pool.query(
      `SELECT * FROM user_memories WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2`,
      [userId, MAX_MEMORIES_PER_USER]
    );
    return res.rows.map(mapUserMemoryRow);
  }

  public async addUserMemory(
    userId: string,
    rawContent: string,
    rawCategory: UserMemoryCategory = 'context',
    source: UserMemorySource = 'auto'
  ): Promise<UserMemory | null> {
    await this.ensureReady();
    const content = normalizeMemoryContent(rawContent);
    if (content.length < MIN_MEMORY_CONTENT_CHARS) {
      return null;
    }
    const category = normalizeMemoryCategory(rawCategory);
    const now = new Date().toISOString();
    const normalizedKey = content.toLowerCase();

    if (!this.pool) {
      const existing = this.memory!.user_memories.find(
        m => m.user_id === userId && m.content.trim().toLowerCase() === normalizedKey
      );
      if (existing) {
        existing.category = category;
        existing.source = source === 'manual' ? 'manual' : existing.source;
        existing.updated_at = now;
        return { ...existing };
      }

      const mem: UserMemory = {
        id: `mem_${crypto.randomUUID().slice(0, 10)}`,
        user_id: userId,
        content,
        category,
        source,
        created_at: now,
        updated_at: now
      };
      this.memory!.user_memories.unshift(mem);

      // Keep bounded at MAX_MEMORIES_PER_USER per user
      const userMems = this.memory!.user_memories.filter(m => m.user_id === userId);
      if (userMems.length > MAX_MEMORIES_PER_USER) {
        const dropIds = new Set(
          userMems
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(MAX_MEMORIES_PER_USER)
            .map(m => m.id)
        );
        this.memory!.user_memories = this.memory!.user_memories.filter(m => !dropIds.has(m.id));
      }

      return { ...mem };
    }

    const existingRes = await this.pool.query(
      `SELECT * FROM user_memories WHERE user_id = $1 AND LOWER(TRIM(content)) = $2 LIMIT 1`,
      [userId, normalizedKey]
    );
    if (existingRes.rows[0]) {
      const updatedRes = await this.pool.query(
        `UPDATE user_memories
         SET category = $1,
             source = CASE WHEN $2 = 'manual' THEN 'manual' ELSE source END,
             updated_at = $3
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [category, source, now, existingRes.rows[0].id, userId]
      );
      return mapUserMemoryRow(updatedRes.rows[0]);
    }

    const id = `mem_${crypto.randomUUID().slice(0, 10)}`;
    const insertRes = await this.pool.query(
      `INSERT INTO user_memories (id, user_id, content, category, source, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [id, userId, content, category, source, now, now]
    );

    // Trim oldest beyond MAX_MEMORIES_PER_USER
    await this.pool.query(
      `DELETE FROM user_memories
       WHERE user_id = $1
         AND id NOT IN (
           SELECT id FROM user_memories WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2
         )`,
      [userId, MAX_MEMORIES_PER_USER]
    );

    return mapUserMemoryRow(insertRes.rows[0]);
  }

  public async deleteUserMemory(id: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.pool) {
      const prev = this.memory!.user_memories.length;
      this.memory!.user_memories = this.memory!.user_memories.filter(
        m => !(m.id === id && m.user_id === userId)
      );
      return this.memory!.user_memories.length < prev;
    }

    const res = await this.pool.query(
      `DELETE FROM user_memories WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async clearUserMemories(userId: string): Promise<number> {
    await this.ensureReady();
    if (!this.pool) {
      const prev = this.memory!.user_memories.length;
      this.memory!.user_memories = this.memory!.user_memories.filter(m => m.user_id !== userId);
      return prev - this.memory!.user_memories.length;
    }

    const res = await this.pool.query(
      `DELETE FROM user_memories WHERE user_id = $1`,
      [userId]
    );
    return res.rowCount ?? 0;
  }
}

export const db = new Database();
