import type { PoolConfig } from 'pg';

export function resolvePostgresPoolConfig(
  rawDatabaseUrl: string | undefined = process.env.DATABASE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV
): PoolConfig | null {
  const connectionString = (rawDatabaseUrl || '').trim();
  if (!connectionString) {
    return null;
  }

  let useSsl = false;
  try {
    const parsed = new URL(connectionString);
    const sslMode = (parsed.searchParams.get('sslmode') || '').toLowerCase();
    const host = (parsed.hostname || '').toLowerCase();
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1';
    const isRailwayInternal = host.endsWith('.railway.internal');

    if (sslMode === 'disable') {
      useSsl = false;
    } else if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full' || sslMode === 'no-verify') {
      useSsl = true;
    } else if (isLocalHost || isRailwayInternal) {
      useSsl = false;
    } else if (nodeEnv === 'production' || host.includes('railway') || host.includes('rlwy.net') || host.includes('neon.tech') || host.includes('supabase') || !isLocalHost) {
      useSsl = true;
    }
  } catch {
    useSsl = nodeEnv === 'production';
  }

  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

export const POSTGRES_SCHEMA_STATEMENTS: readonly string[] = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    usage_limit BIGINT NOT NULL DEFAULT 0,
    current_usage BIGINT NOT NULL DEFAULT 0,
    firebase_uid TEXT,
    avatar_url TEXT NOT NULL DEFAULT '',
    reset_token TEXT,
    reset_token_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`,

  // 2. Subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('monthly', 'yearly')),
    plan_name TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    payment_method TEXT NOT NULL DEFAULT '',
    trx_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)`,

  // 3. Payments
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    subscription_id TEXT,
    plan_id TEXT CHECK (plan_id IN ('monthly', 'yearly', 'developer_api')),
    plan_name TEXT,
    amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    gateway TEXT NOT NULL,
    trx_id TEXT NOT NULL,
    sender_number TEXT NOT NULL DEFAULT '',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'rejected')),
    admin_note TEXT,
    developer_api_key_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    meta_fbp TEXT,
    meta_fbc TEXT,
    meta_client_ip TEXT,
    meta_client_user_agent TEXT,
    meta_event_source_url TEXT
  )`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS developer_api_key_id TEXT`,
  `ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_plan_id_check`,
  `ALTER TABLE payments ADD CONSTRAINT payments_plan_id_check CHECK (plan_id IN ('monthly', 'yearly', 'developer_api'))`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_fbp TEXT`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_fbc TEXT`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_client_ip TEXT`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_client_user_agent TEXT`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_event_source_url TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_trx_id_upper ON payments (UPPER(trx_id))`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)`,

  // 4. AI Providers
  `CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    api_key TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 5. AI Models
  `CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description_en TEXT NOT NULL DEFAULT '',
    custom_name TEXT,
    default_name TEXT NOT NULL DEFAULT '',
    custom_icon TEXT,
    default_icon TEXT NOT NULL DEFAULT 'default',
    custom_description TEXT,
    default_description TEXT NOT NULL DEFAULT '',
    badge TEXT NOT NULL DEFAULT 'balanced',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    context_window INTEGER NOT NULL DEFAULT 128000,
    max_output_tokens INTEGER NOT NULL DEFAULT 4096,
    sort_order INTEGER NOT NULL DEFAULT 0,
    openrouter_model_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS custom_name TEXT`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS default_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS custom_icon TEXT`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS default_icon TEXT NOT NULL DEFAULT 'default'`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS custom_description TEXT`,
  `ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS default_description TEXT NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS idx_ai_models_sort_order ON ai_models (sort_order)`,

  // 6. Chats
  `CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    model_id TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id, updated_at DESC)`,

  // 7. Messages
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL DEFAULT '',
    model_id TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id, created_at ASC)`,

  // 8. Usage Records
  `CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT,
    model_id TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records (user_id)`,

  // 9. Admin Settings (stores system settings + all Admin Console AI provider API keys)
  `CREATE TABLE IF NOT EXISTS admin_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 10. Admin Finance Ledger (isolated standalone Money Management storage)
  `CREATE TABLE IF NOT EXISTS admin_finance_ledger (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'ad_spend')),
    category TEXT NOT NULL CHECK (category IN ('monthly_plan', 'yearly_plan', 'custom_income', 'meta_ads')),
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    amount_bdt DOUBLE PRECISION NOT NULL,
    entry_date TEXT NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_finance_ledger_date ON admin_finance_ledger (entry_date DESC, created_at DESC)`,

  // 11. Per-Page Dynamic SEO Configurations
  `CREATE TABLE IF NOT EXISTS page_seo_configs (
    slug TEXT PRIMARY KEY,
    page_label TEXT NOT NULL DEFAULT '',
    meta_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    focus_keyword TEXT NOT NULL DEFAULT '',
    og_image_url TEXT NOT NULL DEFAULT '/og-banner.png',
    twitter_card TEXT NOT NULL DEFAULT 'summary_large_image' CHECK (twitter_card IN ('summary_large_image', 'summary')),
    twitter_title TEXT NOT NULL DEFAULT '',
    twitter_description TEXT NOT NULL DEFAULT '',
    twitter_handle TEXT NOT NULL DEFAULT '@banglaaipro',
    canonical_override TEXT NOT NULL DEFAULT '',
    no_index BOOLEAN NOT NULL DEFAULT FALSE,
    no_follow BOOLEAN NOT NULL DEFAULT FALSE,
    faq_schema_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_page_seo_configs_updated_at ON page_seo_configs (updated_at DESC)`,

  // 12. Persistent User Memories (cross-session preferences, instructions & context)
  `CREATE TABLE IF NOT EXISTS user_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'context' CHECK (category IN ('preference', 'instruction', 'context', 'profile')),
    source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories (user_id, updated_at DESC)`,

  // 13. Developer API Keys (OpenAI-compatible /api/v1/chat/completions access)
  `CREATE TABLE IF NOT EXISTS developer_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default API Key',
    key_prefix TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    credits INTEGER NOT NULL DEFAULT 50,
    daily_limit INTEGER NOT NULL DEFAULT 50,
    daily_requests_used INTEGER NOT NULL DEFAULT 0,
    daily_usage_date TEXT NOT NULL DEFAULT '',
    total_requests INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user_id ON developer_api_keys (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_developer_api_keys_hash ON developer_api_keys (key_hash)`,
];

export const PROVIDER_ENV_KEY_MAP: Record<string, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  xai: 'XAI_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
};

export function resolveEnvApiKeyForProvider(
  slug: string,
  env: Record<string, string | undefined> = process.env
): string {
  const envName = PROVIDER_ENV_KEY_MAP[slug];
  if (!envName) return '';
  return (env[envName] || '').trim();
}
