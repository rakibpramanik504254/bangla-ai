import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Database, type PoolLike, type QueryExecutor } from './database.ts';
import { createFinanceEntry } from '../utils/financeLedger.ts';
import { isFreeAiModel, isPaidAiModel } from '../utils/modelTier.ts';

interface MockState {
  ddlExecuted: string[];
  queries: string[];
  adminSettings: Map<string, string>;
  providers: Map<string, any>;
  users: Map<string, any>;
  subscriptions: Map<string, any>;
  payments: Map<string, any>;
  chats: Map<string, any>;
  messages: Map<string, any>;
  aiModels: Map<string, any>;
  financeLedger: Map<string, any>;
  pageSeoConfigs: Map<string, any>;
}

function createMockPool(): { pool: PoolLike; state: MockState } {
  const state: MockState = {
    ddlExecuted: [],
    queries: [],
    adminSettings: new Map(),
    providers: new Map(),
    users: new Map(),
    subscriptions: new Map(),
    payments: new Map(),
    chats: new Map(),
    messages: new Map(),
    aiModels: new Map(),
    financeLedger: new Map(),
    pageSeoConfigs: new Map()
  };

  const executeQuery = async (text: string, params: unknown[] = []) => {
    const sql = text.replace(/\s+/g, ' ').trim();
    state.queries.push(sql);

    if (/^(CREATE|ALTER)\b/i.test(sql)) {
      state.ddlExecuted.push(sql);
      return { rows: [], rowCount: 0 };
    }
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }

    if (sql.startsWith('SELECT COUNT(*)::int AS cnt FROM users')) {
      return { rows: [{ cnt: state.users.size }], rowCount: 1 };
    }

    if (sql.startsWith('INSERT INTO users')) {
      const id = String(params[0]);
      const email = String(params[1]);
      // Support both Google upsert (9 params) and standard createUser / seed insert
      const now = new Date().toISOString();
      let row: any;
      if (sql.includes('ON CONFLICT (email)')) {
        // upsertGoogleUser
        const existing = Array.from(state.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
        row = existing
          ? {
              ...existing,
              firebase_uid: params[5],
              avatar_url: params[6] || existing.avatar_url,
              last_login_at: params[7],
              updated_at: params[7]
            }
          : {
              id,
              email,
              password_hash: '',
              name: params[2],
              phone: '',
              role: params[3],
              status: 'active',
              usage_limit: params[4],
              current_usage: 0,
              firebase_uid: params[5],
              avatar_url: params[6] || '',
              last_login_at: params[7],
              created_at: now,
              updated_at: now
            };
      } else if (params.length === 11) {
        row = {
          id,
          email,
          password_hash: params[2],
          name: params[3],
          phone: params[4],
          role: params[5],
          status: params[6],
          usage_limit: params[7],
          current_usage: params[8],
          firebase_uid: null,
          avatar_url: '',
          created_at: params[9],
          updated_at: params[10]
        };
      } else {
        row = {
          id,
          email,
          password_hash: params[2],
          name: params[3],
          phone: params[4],
          role: params[5],
          status: params[6],
          usage_limit: params[7],
          current_usage: params[8],
          firebase_uid: params[9],
          avatar_url: params[10] || '',
          reset_token: params[11],
          reset_token_expires_at: params[12],
          created_at: params[13],
          updated_at: params[14]
        };
      }
      if (!state.users.has(row.id) || sql.includes('ON CONFLICT (email)')) {
        state.users.set(row.id, row);
      }
      return { rows: [row], rowCount: 1 };
    }

    if (sql.startsWith('SELECT * FROM users WHERE firebase_uid = $1 OR LOWER(email) = $2')) {
      const uid = String(params[0]);
      const emailLower = String(params[1]).toLowerCase();
      const found = Array.from(state.users.values()).find(
        u => u.firebase_uid === uid || u.email.toLowerCase() === emailLower
      );
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('SELECT * FROM users WHERE id = $1')) {
      const found = state.users.get(String(params[0]));
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('SELECT * FROM users WHERE LOWER(email) = $1')) {
      const emailLower = String(params[0]).toLowerCase();
      const found = Array.from(state.users.values()).find(u => u.email.toLowerCase() === emailLower);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('UPDATE users SET firebase_uid = $1')) {
      const id = String(params[6]);
      const existing = state.users.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const updated = {
        ...existing,
        firebase_uid: params[0],
        avatar_url: params[1],
        name: params[2],
        role: params[3],
        usage_limit: params[4],
        last_login_at: params[5],
        updated_at: params[5]
      };
      state.users.set(id, updated);
      return { rows: [updated], rowCount: 1 };
    }

    if (sql.startsWith('INSERT INTO ai_providers')) {
      const id = String(params[0]);
      if (!state.providers.has(id)) {
        state.providers.set(id, {
          id,
          name: params[1],
          slug: params[2],
          api_key: params[3],
          base_url: params[4],
          is_active: params[5],
          created_at: params[6],
          updated_at: params[7]
        });
      }
      return { rows: [], rowCount: 1 };
    }

    if (sql.startsWith('SELECT * FROM ai_providers ORDER BY')) {
      return { rows: Array.from(state.providers.values()), rowCount: state.providers.size };
    }

    if (sql.startsWith('SELECT * FROM ai_providers WHERE id = $1')) {
      const found = state.providers.get(String(params[0]));
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('SELECT * FROM ai_providers WHERE slug = $1')) {
      const found = Array.from(state.providers.values()).find(p => p.slug === params[0]);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('UPDATE ai_providers SET api_key = $1')) {
      const id = String(params[4]);
      const existing = state.providers.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const updated = {
        ...existing,
        api_key: params[0],
        base_url: params[1],
        is_active: params[2],
        updated_at: params[3]
      };
      state.providers.set(id, updated);
      return { rows: [updated], rowCount: 1 };
    }

    if (sql.startsWith('INSERT INTO admin_settings')) {
      const key = String(params[0]);
      const value = String(params[1]);
      if (sql.includes('ON CONFLICT (setting_key) DO UPDATE')) {
        state.adminSettings.set(key, value);
      } else if (!state.adminSettings.has(key)) {
        state.adminSettings.set(key, value);
      }
      return { rows: [], rowCount: 1 };
    }

    if (sql.startsWith('SELECT setting_value FROM admin_settings WHERE setting_key = $1')) {
      const val = state.adminSettings.get(String(params[0]));
      return val !== undefined ? { rows: [{ setting_value: val }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }

    if (sql.startsWith('INSERT INTO admin_finance_ledger')) {
      const row = {
        id: String(params[0]),
        type: params[1],
        category: params[2],
        title: params[3],
        note: params[4],
        amount_bdt: params[5],
        entry_date: params[6],
        deleted_at: params[7],
        created_at: params[8],
        updated_at: params[9]
      };
      state.financeLedger.set(row.id, row);
      return { rows: [row], rowCount: 1 };
    }

    if (sql.startsWith('SELECT * FROM admin_finance_ledger')) {
      const rows = Array.from(state.financeLedger.values()).sort((a, b) =>
        b.entry_date.localeCompare(a.entry_date)
      );
      return { rows, rowCount: rows.length };
    }

    if (sql.startsWith('DELETE FROM admin_finance_ledger WHERE id = $1')) {
      const existed = state.financeLedger.delete(String(params[0]));
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    if (sql.startsWith('DELETE FROM admin_finance_ledger WHERE deleted_at IS NOT NULL')) {
      let removed = 0;
      for (const [k, v] of state.financeLedger.entries()) {
        if (v.deleted_at !== null && v.deleted_at !== undefined) {
          state.financeLedger.delete(k);
          removed++;
        }
      }
      return { rows: [], rowCount: removed };
    }

    if (sql === 'DELETE FROM admin_finance_ledger') {
      const count = state.financeLedger.size;
      state.financeLedger.clear();
      return { rows: [], rowCount: count };
    }

    if (sql.startsWith('INSERT INTO page_seo_configs')) {
      const row = {
        slug: String(params[0]),
        page_label: params[1],
        meta_title: params[2],
        meta_description: params[3],
        focus_keyword: params[4],
        og_image_url: params[5],
        twitter_card: params[6],
        twitter_title: params[7],
        twitter_description: params[8],
        twitter_handle: params[9],
        canonical_override: params[10],
        no_index: params[11],
        no_follow: params[12],
        faq_schema_enabled: params[13],
        faq_items: params[14],
        updated_at: params[15]
      };
      if (sql.includes('DO UPDATE SET') || !state.pageSeoConfigs.has(row.slug)) {
        state.pageSeoConfigs.set(row.slug, row);
      }
      return { rows: [row], rowCount: 1 };
    }

    if (sql.startsWith('SELECT * FROM page_seo_configs WHERE slug = $1')) {
      const found = state.pageSeoConfigs.get(String(params[0]));
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql === 'SELECT * FROM page_seo_configs') {
      const rows = Array.from(state.pageSeoConfigs.values());
      return { rows, rowCount: rows.length };
    }

    if (sql.startsWith('DELETE FROM page_seo_configs WHERE slug = $1')) {
      const deleted = state.pageSeoConfigs.delete(String(params[0]));
      return { rows: [], rowCount: deleted ? 1 : 0 };
    }

    if (sql.startsWith('INSERT INTO ai_models')) {
      const id = String(params[0]);
      if (!state.aiModels.has(id)) {
        state.aiModels.set(id, {
          id,
          provider_id: params[1],
          model_name: params[2],
          display_name: params[3],
          description_en: params[4],
          custom_name: params[5],
          default_name: params[6],
          custom_icon: params[7],
          default_icon: params[8],
          custom_description: params[9],
          default_description: params[10],
          badge: params[11],
          is_enabled: params[12],
          is_default: params[13],
          is_free: params[14],
          context_window: params[15],
          max_output_tokens: params[16],
          sort_order: params[17],
          openrouter_model_id: params[18],
          created_at: params[19]
        });
      }
      return { rows: [], rowCount: 1 };
    }

    if (sql.startsWith("SELECT * FROM ai_models WHERE default_name = '' OR default_name IS NULL")) {
      const rows = Array.from(state.aiModels.values()).filter(m => !m.default_name);
      return { rows, rowCount: rows.length };
    }

    if (sql.startsWith('SELECT * FROM ai_models WHERE id = $1')) {
      const found = state.aiModels.get(String(params[0]));
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (sql.startsWith('SELECT * FROM ai_models')) {
      const onlyEnabled = sql.includes('WHERE is_enabled = TRUE');
      const rows = Array.from(state.aiModels.values())
        .filter(m => !onlyEnabled || m.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);
      return { rows, rowCount: rows.length };
    }

    if (sql.startsWith('UPDATE ai_models SET is_enabled = $1, is_default = $2')) {
      const id = String(params[13]);
      const existing = state.aiModels.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const updated = {
        ...existing,
        is_enabled: params[0],
        is_default: params[1],
        badge: params[2],
        display_name: params[3],
        openrouter_model_id: params[4],
        description_en: params[5],
        sort_order: params[6],
        custom_name: params[7],
        custom_description: params[8],
        custom_icon: params[9],
        default_name: params[10],
        default_description: params[11],
        default_icon: params[12]
      };
      state.aiModels.set(id, updated);
      return { rows: [updated], rowCount: 1 };
    }

    if (sql.startsWith('UPDATE ai_models SET custom_name = NULL') && sql.includes('WHERE id = $1')) {
      const id = String(params[0]);
      const existing = state.aiModels.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const reset = {
        ...existing,
        custom_name: null,
        custom_description: null,
        custom_icon: null,
        display_name: existing.default_name || existing.display_name,
        description_en: existing.default_description || existing.description_en
      };
      state.aiModels.set(id, reset);
      return { rows: [reset], rowCount: 1 };
    }

    if (sql.startsWith('UPDATE ai_models SET custom_name = NULL') && sql.includes('WHERE custom_name IS NOT NULL')) {
      let count = 0;
      for (const [id, existing] of state.aiModels.entries()) {
        if (existing.custom_name !== null || existing.custom_description !== null || existing.custom_icon !== null) {
          state.aiModels.set(id, {
            ...existing,
            custom_name: null,
            custom_description: null,
            custom_icon: null,
            display_name: existing.default_name || existing.display_name,
            description_en: existing.default_description || existing.description_en
          });
          count++;
        }
      }
      return { rows: [], rowCount: count };
    }

    if (sql.startsWith('UPDATE ai_models SET is_enabled = $1 WHERE is_free = TRUE')) {
      const enabled = Boolean(params[0]);
      let count = 0;
      for (const [id, existing] of state.aiModels.entries()) {
        if (isFreeAiModel(existing)) {
          state.aiModels.set(id, { ...existing, is_enabled: enabled });
          count++;
        }
      }
      return { rows: [], rowCount: count };
    }

    if (sql.startsWith('UPDATE ai_models SET is_enabled = $1 WHERE COALESCE(is_free, FALSE) = FALSE')) {
      const enabled = Boolean(params[0]);
      let count = 0;
      for (const [id, existing] of state.aiModels.entries()) {
        if (isPaidAiModel(existing)) {
          state.aiModels.set(id, { ...existing, is_enabled: enabled });
          count++;
        }
      }
      return { rows: [], rowCount: count };
    }

    return { rows: [], rowCount: 0 };
  };

  const client: QueryExecutor & { release: () => void } = {
    query: executeQuery,
    release: () => {}
  };

  const pool: PoolLike = {
    query: executeQuery,
    connect: async () => client
  };

  return { pool, state };
}

describe('Database PostgreSQL Persistence', () => {
  it('auto-creates schema tables and persists provider API keys inside admin_settings with env fallback', async () => {
    const { pool, state } = createMockPool();
    const database = new Database({
      pool,
      env: { OPENROUTER_API_KEY: 'sk-or-env-fallback-123456' }
    });

    await database.init();

    // All DDL statements executed on init
    assert.ok(state.ddlExecuted.some(s => s.includes('CREATE TABLE IF NOT EXISTS admin_settings')));
    assert.ok(state.ddlExecuted.some(s => s.includes('CREATE TABLE IF NOT EXISTS admin_finance_ledger')));

    // Reads environment variable fallback before any Admin Panel override is saved
    const initialOpenRouter = await database.getProviderBySlug('openrouter');
    assert.equal(initialOpenRouter?.api_key, 'sk-or-env-fallback-123456');

    // Saving a key in Admin Console persists to admin_settings ('provider_api_keys') & overrides env
    await database.updateProvider('prov_openrouter', { api_key: 'sk-or-admin-saved-999999' });
    const storedJson = state.adminSettings.get('provider_api_keys');
    assert.ok(storedJson);
    const parsedKeys = JSON.parse(storedJson);
    assert.equal(parsedKeys.openrouter.api_key, 'sk-or-admin-saved-999999');

    const reloaded = await database.getProviderBySlug('openrouter');
    assert.equal(reloaded?.api_key, 'sk-or-admin-saved-999999');
  });

  it('persists Google login users, avatar URLs, and updates existing users across logins', async () => {
    const { pool } = createMockPool();
    const database = new Database({ pool, env: {} });
    await database.init();

    const created = await database.upsertGoogleUser({
      email: 'customer@example.com',
      name: 'Customer One',
      uid: 'fb_uid_123',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo1'
    });
    assert.equal(created.email, 'customer@example.com');
    assert.equal(created.avatar_url, 'https://lh3.googleusercontent.com/a/photo1');

    const fetched = await database.getUserByEmail('customer@example.com');
    assert.equal(fetched?.firebase_uid, 'fb_uid_123');

    const updated = await database.upsertGoogleUser({
      email: 'customer@example.com',
      name: 'Customer One',
      uid: 'fb_uid_123',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo2'
    });
    assert.equal(updated.avatar_url, 'https://lh3.googleusercontent.com/a/photo2');
  });

  it('persists isolated admin_finance_ledger CRUD independently from customer tables', async () => {
    const { pool, state } = createMockPool();
    const database = new Database({ pool, env: {} });
    await database.init();

    const sale = createFinanceEntry({
      type: 'income',
      category: 'monthly_plan',
      amountBDT: 699,
      date: '2026-04-10',
      note: 'bKash Customer'
    });
    const adSpend = createFinanceEntry({
      type: 'ad_spend',
      category: 'meta_ads',
      amountBDT: 1500,
      date: '2026-04-10'
    });

    await database.upsertFinanceLedgerEntry(sale);
    await database.upsertFinanceLedgerEntry(adSpend);

    const listed = await database.listFinanceLedgerEntries();
    assert.equal(listed.length, 2);
    assert.equal(state.users.size > 0, true);

    await database.upsertFinanceLedgerEntry({ ...sale, deletedAt: new Date().toISOString() });
    const removedTrash = await database.emptyFinanceLedgerTrash();
    assert.equal(removedTrash, 1);

    const remaining = await database.listFinanceLedgerEntries();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, adSpend.id);

    const resetCount = await database.resetFinanceLedger();
    assert.equal(resetCount, 1);
    assert.equal((await database.listFinanceLedgerEntries()).length, 0);
  });

  it('persists ai_models custom name/description/icon in PostgreSQL without altering routing slugs and supports single + global reset', async () => {
    const { pool } = createMockPool();
    const database = new Database({ pool, env: {} });
    await database.init();

    const target = await database.getModelById('mod_or_free_gemma_4_31b');
    assert.ok(target);
    assert.equal(target.default_icon, 'gemini');
    assert.equal(target.openrouter_model_id, 'google/gemma-4-31b-it:free');

    // Customize name, description, and logo
    const updated = await database.updateModel('mod_or_free_gemma_4_31b', {
      custom_name: 'DeepSeek Custom Pro',
      custom_description: 'Deep coding and reasoning engine.',
      custom_icon: 'deepseek'
    });
    assert.ok(updated);
    assert.equal(updated.display_name, 'DeepSeek Custom Pro');
    assert.equal(updated.description_en, 'Deep coding and reasoning engine.');
    assert.equal(updated.custom_icon, 'deepseek');
    assert.equal(updated.default_name, 'Google Gemma 4 31B (Free)');
    assert.equal(updated.default_icon, 'gemini');
    // Routing slug must remain untouched
    assert.equal(updated.model_name, 'google/gemma-4-31b-it:free');
    assert.equal(updated.openrouter_model_id, 'google/gemma-4-31b-it:free');

    // Reset single model back to defaults
    const resetSingle = await database.resetModelCustomizations('mod_or_free_gemma_4_31b');
    assert.ok(resetSingle);
    assert.equal(resetSingle.custom_name, null);
    assert.equal(resetSingle.custom_description, null);
    assert.equal(resetSingle.custom_icon, null);
    assert.equal(resetSingle.display_name, 'Google Gemma 4 31B (Free)');
    assert.equal(resetSingle.default_icon, 'gemini');

    // Customize two models and test global reset
    await database.updateModel('mod_gemini_4_carbon', { custom_icon: 'claude', custom_name: 'Claude Carbon' });
    await database.updateModel('mod_gpt_6_astra', { custom_icon: 'nvidia' });
    const resetCount = await database.resetAllModelCustomizations();
    assert.equal(resetCount, 2);

    const carbonAfter = await database.getModelById('mod_gemini_4_carbon');
    assert.equal(carbonAfter?.custom_icon, null);
    assert.equal(carbonAfter?.custom_name, null);
    assert.equal(carbonAfter?.display_name, 'Gemini 4 Carbon (high)');
  });

  it('persists SEO title, description, and OG banner URL/data in PostgreSQL admin_settings', async () => {
    const { pool, state } = createMockPool();
    const db1 = new Database({ pool, env: {} });
    await db1.init();

    const defaults = await db1.getSettings();
    assert.equal(defaults.seo_og_image_url, '/og-banner.png');
    assert.ok(defaults.seo_title && defaults.seo_title.includes('Bangla-AI.pro'));

    await db1.updateSettings({
      seo_title: 'Bangla-AI.pro — Custom Social Title',
      seo_description: 'Custom Bengali + English SEO description for crawlers.',
      seo_og_image_url: '/api/seo/og-banner?v=12345',
      seo_og_image_data: 'data:image/png;base64,iVBORw0KGgo='
    });

    const db2 = new Database({ pool, env: {} });
    await db2.init();
    const reloaded = await db2.getSettings();

    assert.equal(reloaded.seo_title, 'Bangla-AI.pro — Custom Social Title');
    assert.equal(reloaded.seo_description, 'Custom Bengali + English SEO description for crawlers.');
    assert.equal(reloaded.seo_og_image_url, '/api/seo/og-banner?v=12345');
    assert.equal(reloaded.seo_og_image_data, 'data:image/png;base64,iVBORw0KGgo=');
    assert.ok(state.adminSettings.has('system_settings'));
  });

  it('toggles all paid (flagship) models ON and OFF without altering OpenRouter free models', async () => {
    const { pool } = createMockPool();
    const database = new Database({ pool, env: {} });
    await database.init();

    const initial = await database.listModels(false);
    const initialPaid = initial.filter(isPaidAiModel);
    const initialFree = initial.filter(isFreeAiModel);
    assert.ok(initialPaid.length > 0);
    assert.ok(initialFree.length > 0);
    assert.ok(initialPaid.every(m => m.is_enabled === true));
    assert.ok(initialFree.every(m => m.is_enabled === false));

    // Turn all paid models OFF
    const disabledCount = await database.bulkTogglePaidModels(false);
    assert.equal(disabledCount, initialPaid.length);

    const afterPaidOff = await database.listModels(false);
    assert.ok(afterPaidOff.filter(isPaidAiModel).every(m => m.is_enabled === false));
    assert.ok(afterPaidOff.filter(isFreeAiModel).every(m => m.is_enabled === false));

    // Turn free models ON independently, verify paid models stay OFF
    const freeEnabledCount = await database.bulkToggleFreeModels(true);
    assert.equal(freeEnabledCount, initialFree.length);
    const afterFreeOn = await database.listModels(false);
    assert.ok(afterFreeOn.filter(isPaidAiModel).every(m => m.is_enabled === false));
    assert.ok(afterFreeOn.filter(isFreeAiModel).every(m => m.is_enabled === true));

    // Turn all paid models back ON, verify free models remain untouched (ON)
    const reEnabledCount = await database.bulkTogglePaidModels(true);
    assert.equal(reEnabledCount, initialPaid.length);
    const afterPaidOn = await database.listModels(false);
    assert.ok(afterPaidOn.filter(isPaidAiModel).every(m => m.is_enabled === true));
    assert.ok(afterPaidOn.filter(isFreeAiModel).every(m => m.is_enabled === true));
  });

  it('auto-creates page_seo_configs table, seeds presets, and persists upserts, resets, and deletes', async () => {
    const { pool, state } = createMockPool();
    const database = new Database({ pool, env: {} });
    await database.init();

    assert.ok(state.ddlExecuted.some(s => s.includes('CREATE TABLE IF NOT EXISTS page_seo_configs')));
    const seeded = await database.listPageSeoConfigs();
    assert.ok(seeded.length >= 7);
    assert.equal(seeded[0].slug, '/');

    const saved = await database.upsertPageSeoConfig({
      slug: '/bangla-chatgpt',
      pageLabel: 'Bangla Chatgpt',
      metaTitle: 'Bangla ChatGPT Workspace — Bangla-AI.pro',
      metaDescription: 'Use ChatGPT in Bangla with bKash payment.',
      focusKeyword: 'bangla ai',
      ogImageUrl: '/og-banner.png',
      twitterCard: 'summary_large_image',
      twitterTitle: '',
      twitterDescription: '',
      twitterHandle: '@banglaaipro',
      canonicalOverride: 'https://bangla-ai.pro/bangla-chatgpt',
      noIndex: true,
      noFollow: false,
      faqSchemaEnabled: true,
      faqItems: [{ id: 'f1', question: 'Works in Bangla?', answer: 'Yes, natively.' }],
      updatedAt: new Date().toISOString()
    });
    assert.equal(saved.slug, '/bangla-chatgpt');
    assert.equal(saved.noIndex, true);
    assert.equal(saved.faqItems.length, 1);

    const fetched = await database.getPageSeoConfigBySlug('/bangla-chatgpt');
    assert.ok(fetched);
    assert.equal(fetched.metaTitle, 'Bangla ChatGPT Workspace — Bangla-AI.pro');

    // Customize /about and reset back to preset
    await database.upsertPageSeoConfig({
      ...seeded[1],
      metaTitle: 'Temporary Modified Title'
    });
    const resetAbout = await database.resetPageSeoConfig('/about');
    assert.ok(resetAbout);
    assert.notEqual(resetAbout.metaTitle, 'Temporary Modified Title');

    const deleted = await database.deletePageSeoConfig('/bangla-chatgpt');
    assert.equal(deleted, true);
    assert.equal(await database.getPageSeoConfigBySlug('/bangla-chatgpt'), undefined);
  });

  it('supports per-page SEO CRUD & reset in volatile in-memory mode as well', async () => {
    const database = new Database({ pool: null, env: {} });
    await database.init();

    const list = await database.listPageSeoConfigs();
    assert.equal(list[0].slug, '/');

    await database.upsertPageSeoConfig({
      ...list[0],
      metaTitle: 'Updated Home Meta Title'
    });
    const updatedHome = await database.getPageSeoConfigBySlug('/');
    assert.equal(updatedHome?.metaTitle, 'Updated Home Meta Title');

    const resetHome = await database.resetPageSeoConfig('/');
    assert.ok(resetHome);
    assert.notEqual(resetHome.metaTitle, 'Updated Home Meta Title');
  });
});
