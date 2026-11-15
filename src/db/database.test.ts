import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Database, type PoolLike, type QueryExecutor } from './database.ts';
import { createFinanceEntry } from '../utils/financeLedger.ts';

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
  financeLedger: Map<string, any>;
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
    financeLedger: new Map()
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
});
