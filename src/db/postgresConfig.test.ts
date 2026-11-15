import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  POSTGRES_SCHEMA_STATEMENTS,
  PROVIDER_ENV_KEY_MAP,
  resolveEnvApiKeyForProvider,
  resolvePostgresPoolConfig
} from './postgresConfig.ts';

describe('resolvePostgresPoolConfig', () => {
  it('returns null when DATABASE_URL is missing or blank', () => {
    assert.equal(resolvePostgresPoolConfig(undefined, 'production'), null);
    assert.equal(resolvePostgresPoolConfig('', 'production'), null);
    assert.equal(resolvePostgresPoolConfig('   ', 'development'), null);
  });

  it('enables SSL with rejectUnauthorized=false for Railway public PostgreSQL URLs', () => {
    const cfg = resolvePostgresPoolConfig(
      'postgresql://postgres:secret@monorail.proxy.rlwy.net:12345/railway',
      'production'
    );
    assert.ok(cfg);
    assert.deepEqual(cfg.ssl, { rejectUnauthorized: false });
  });

  it('disables SSL for Railway internal private network and localhost', () => {
    const internalCfg = resolvePostgresPoolConfig(
      'postgresql://postgres:secret@postgres.railway.internal:5432/railway',
      'production'
    );
    assert.ok(internalCfg);
    assert.equal(internalCfg.ssl, false);

    const localCfg = resolvePostgresPoolConfig(
      'postgresql://postgres:password@localhost:5432/bangla_ai',
      'development'
    );
    assert.ok(localCfg);
    assert.equal(localCfg.ssl, false);
  });

  it('respects explicit sslmode query parameters', () => {
    const disabled = resolvePostgresPoolConfig(
      'postgresql://postgres:secret@db.example.com:5432/app?sslmode=disable',
      'production'
    );
    assert.equal(disabled?.ssl, false);

    const required = resolvePostgresPoolConfig(
      'postgresql://postgres:secret@localhost:5432/app?sslmode=require',
      'development'
    );
    assert.deepEqual(required?.ssl, { rejectUnauthorized: false });
  });
});

describe('POSTGRES_SCHEMA_STATEMENTS', () => {
  it('contains idempotent CREATE TABLE IF NOT EXISTS DDL for all required tables', () => {
    const joined = POSTGRES_SCHEMA_STATEMENTS.join('\n');
    const requiredTables = [
      'users',
      'subscriptions',
      'payments',
      'ai_providers',
      'ai_models',
      'chats',
      'messages',
      'usage_records',
      'admin_settings',
      'admin_finance_ledger'
    ];
    for (const table of requiredTables) {
      assert.match(
        joined,
        new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`),
        `Missing DDL for table ${table}`
      );
    }

    const aiModelCustomizationCols = [
      'custom_name',
      'default_name',
      'custom_icon',
      'default_icon',
      'custom_description',
      'default_description'
    ];
    for (const col of aiModelCustomizationCols) {
      assert.match(
        joined,
        new RegExp(`ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS ${col}\\b`),
        `Missing safe ALTER TABLE migration for ai_models.${col}`
      );
    }
  });
});

describe('resolveEnvApiKeyForProvider', () => {
  it('maps every configured AI provider slug to its environment variable', () => {
    const expectedSlugs = ['openrouter', 'gemini', 'openai', 'anthropic', 'deepseek', 'xai', 'moonshot'];
    for (const slug of expectedSlugs) {
      assert.ok(PROVIDER_ENV_KEY_MAP[slug], `Expected env mapping for ${slug}`);
    }

    const fakeEnv = {
      OPENROUTER_API_KEY: '  sk-or-v1-test  ',
      GEMINI_API_KEY: 'AIza-test'
    };
    assert.equal(resolveEnvApiKeyForProvider('openrouter', fakeEnv), 'sk-or-v1-test');
    assert.equal(resolveEnvApiKeyForProvider('gemini', fakeEnv), 'AIza-test');
    assert.equal(resolveEnvApiKeyForProvider('openai', fakeEnv), '');
  });
});
