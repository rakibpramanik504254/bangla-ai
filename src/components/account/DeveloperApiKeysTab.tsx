import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Key,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import type { DeveloperApiDefaults, DeveloperApiKey } from '../../types/index.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';

interface DeveloperApiKeysTabProps {
  token: string | null;
}

interface DeveloperModelOption {
  id: string;
  display_name: string;
  is_free: boolean;
}

const DEFAULT_BASE_URL = 'https://bangla-ai.pro/api/v1';

export const DeveloperApiKeysTab: React.FC<DeveloperApiKeysTabProps> = ({ token }) => {
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [maxKeys, setMaxKeys] = useState(5);
  const [defaults, setDefaults] = useState<DeveloperApiDefaults>({
    dailyLimit: 50,
    initialCredits: 50,
  });
  const [models, setModels] = useState<DeveloperModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{
    name: string;
    plainKey: string;
  } | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<'curl' | 'node' | 'python'>('curl');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchKeys = useCallback(
    async (silent = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/developer/keys', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load Developer API keys.');
        }
        setBaseUrl(typeof data.baseUrl === 'string' ? data.baseUrl : DEFAULT_BASE_URL);
        setMaxKeys(Number(data.maxKeys) || 5);
        if (data.defaults) {
          setDefaults({
            dailyLimit: Number(data.defaults.dailyLimit) || 50,
            initialCredits: Number(data.defaults.initialCredits) || 50,
          });
        }
        setKeys(Array.isArray(data.keys) ? data.keys : []);
        setModels(Array.isArray(data.models) ? data.models : []);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Could not load your API keys.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCopy = async (text: string, id: string) => {
    await copyTextSafely(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || creating) return;
    setFeedback(null);
    setCreating(true);
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newKeyName.trim() || 'Default API Key',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate API key.');
      }
      setNewKeyName('');
      if (data.key) {
        setKeys((prev) => [data.key, ...prev]);
      } else {
        await fetchKeys(true);
      }
      if (typeof data.plainKey === 'string') {
        setNewlyCreatedKey({
          name: data.key?.name || 'API Key',
          plainKey: data.plainKey,
        });
      }
      setFeedback({
        type: 'success',
        text: 'New API key generated. Copy and store it safely — it is only shown once.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not create API key.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!token || deletingId) return;
    setFeedback(null);
    setDeletingId(keyId);
    try {
      const res = await fetch(`/api/developer/keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete API key.');
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: 'API key revoked and deleted permanently.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not delete API key.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const activeKeys = keys.filter((k) => k.is_enabled);
  const totalCredits = keys.reduce((sum, k) => sum + k.credits, 0);
  const totalDailyRemaining = activeKeys.reduce((sum, k) => sum + k.daily_remaining, 0);
  const totalDailyLimit = activeKeys.reduce((sum, k) => sum + k.daily_limit, 0);
  const sampleModel = models[0]?.id || 'gpt-6-astra';
  const displayKeyForSnippet = newlyCreatedKey?.plainKey || 'sk-banglaai-your-api-key';

  const codeSnippets: Record<'curl' | 'node' | 'python', string> = {
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${displayKeyForSnippet}" \\
  -d '{
    "model": "${sampleModel}",
    "messages": [{"role": "user", "content": "Hello from Bangla AI API!"}]
  }'`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${displayKeyForSnippet}",
  baseURL: "${baseUrl}"
});

const response = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "Hello from Bangla AI API!" }]
});
console.log(response.choices[0].message.content);`,
    python: `from openai import OpenAI

client = OpenAI(
    api_key="${displayKeyForSnippet}",
    base_url="${baseUrl}"
)

response = client.chat.completions.create(
    model="${sampleModel}",
    messages=[{"role": "user", "content": "Hello from Bangla AI API!"}]
)
print(response.choices[0].message.content)`,
  };

  return (
    <div className="space-y-4 animate-in fade-in" data-testid="account-tab-api-keys">
      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
          <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
            Remaining API Credits
          </span>
          <div>
            <div
              data-testid="developer-api-total-credits"
              className="text-lg font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
            >
              {totalCredits.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              1 credit per API request
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
          <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
            Remaining Daily Limit
          </span>
          <div>
            <div
              data-testid="developer-api-daily-remaining"
              className="text-lg font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
            >
              {activeKeys.length > 0
                ? `${totalDailyRemaining.toLocaleString()} / ${totalDailyLimit.toLocaleString()}`
                : `${defaults.dailyLimit.toLocaleString()} / day`}
            </div>
            <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              Resets daily at 00:00 UTC
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
          <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
            Active API Keys
          </span>
          <div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
              {activeKeys.length}{' '}
              <span className="text-xs font-normal text-[#444746] dark:text-[#9aa0a6]">
                / {maxKeys} max
              </span>
            </div>
            <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              OpenAI SDK compatible
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-2xl p-3.5 text-xs flex items-start justify-between gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{feedback.text}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setFeedback(null)}
            className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* One-time Full Key Reveal Banner */}
      {newlyCreatedKey && (
        <div
          data-testid="newly-created-api-key-banner"
          className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 p-4 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Save Your New API Key ({newlyCreatedKey.name})</span>
              </div>
              <p className="text-[11px] text-[#444746] dark:text-[#c4c7c5] mt-0.5">
                For your security, this full secret key is shown only once. Copy it now before closing.
              </p>
            </div>
            <button
              type="button"
              aria-label="Hide newly created key"
              onClick={() => setNewlyCreatedKey(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#444746] dark:text-[#9aa0a6] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code
              data-testid="newly-created-api-key-value"
              className="flex-1 px-3 py-2.5 rounded-xl bg-white dark:bg-[#131314] border border-emerald-500/25 font-mono text-xs text-[#1f1f1f] dark:text-[#e3e3e3] break-all select-all"
            >
              {newlyCreatedKey.plainKey}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedKey.plainKey, 'new_key')}
              className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {copiedId === 'new_key' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Base URL & OpenAI-Compatible Endpoint Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
              <span>OpenAI-Compatible Base URL</span>
            </h4>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5">
              Drop into any OpenAI SDK, VS Code extension, or HTTP client using{' '}
              <code className="font-mono">/chat/completions</code>.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] font-mono text-xs text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
            {baseUrl}
          </div>
          <button
            type="button"
            data-testid="copy-base-url-btn"
            onClick={() => handleCopy(baseUrl, 'base_url')}
            className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            {copiedId === 'base_url' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied URL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Base URL</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
          Endpoint:{' '}
          <span className="text-[#1f1f1f] dark:text-[#e3e3e3]">
            POST {baseUrl}/chat/completions
          </span>
        </div>
      </div>

      {/* Create New API Key Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Create API Key
            </h4>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5">
              New keys start with{' '}
              <span className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                {defaults.initialCredits}
              </span>{' '}
              credits and{' '}
              <span className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                {defaults.dailyLimit}
              </span>{' '}
              requests/day limit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchKeys(true);
            }}
            disabled={refreshing}
            className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <label htmlFor="new-api-key-name" className="sr-only">
            API Key Label
          </label>
          <input
            id="new-api-key-name"
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={60}
            placeholder="Key label (e.g., My Website, VS Code, Bot)"
            className="flex-1 h-10 px-3.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#444746]/70 dark:placeholder:text-[#9aa0a6]/70 focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={creating || keys.length >= maxKeys}
            data-testid="create-api-key-btn"
            className="h-10 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{creating ? 'Creating...' : 'Create API Key'}</span>
          </button>
        </form>
      </div>

      {/* Existing Keys List */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            Your API Keys ({keys.length})
          </h4>
          <span className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
            Prefix: sk-banglaai-...
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
            Loading your API keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-1.5">
            <Key className="w-6 h-6 mx-auto text-[#444746]/60 dark:text-[#9aa0a6]/60" />
            <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              No API keys yet
            </p>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              Create your first <code className="font-mono">sk-banglaai-...</code> key above to call Bangla AI models from your apps.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {keys.map((key) => {
              const dailyPct =
                key.daily_limit > 0
                  ? Math.min(100, Math.round((key.daily_requests_used / key.daily_limit) * 100))
                  : 100;
              return (
                <div
                  key={key.id}
                  data-testid={`developer-api-key-row-${key.id}`}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                        {key.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          key.is_enabled
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                        }`}
                      >
                        {key.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                      <span className="text-[#1f1f1f] dark:text-[#e3e3e3]">{key.key_prefix}</span>
                      <span>·</span>
                      <span>
                        Credits:{' '}
                        <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {key.credits.toLocaleString()}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Today:{' '}
                        <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {key.daily_requests_used}/{key.daily_limit}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>Total: {key.total_requests.toLocaleString()}</span>
                    </div>

                    <div className="max-w-xs space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            dailyPct >= 90 ? 'bg-red-500' : 'bg-[#1f1f1f] dark:bg-[#e3e3e3]'
                          }`}
                          style={{ width: `${dailyPct}%` }}
                        />
                      </div>
                      <div className="text-[10.5px] text-[#444746] dark:text-[#9aa0a6]">
                        {key.daily_remaining.toLocaleString()} requests remaining today
                        {key.last_used_at
                          ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString('en-US')}`
                          : ' · Never used'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {confirmDeleteId === key.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(key.id)}
                          disabled={deletingId === key.id}
                          className="h-8 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === key.id ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-8 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete API key ${key.name}`}
                        onClick={() => setConfirmDeleteId(key.id)}
                        className="h-8 px-3 rounded-full border border-red-500/25 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quickstart Code Example */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
            <span>Quickstart Example</span>
          </h4>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'curl', label: 'cURL' },
                { id: 'node', label: 'Node.js' },
                { id: 'python', label: 'Python' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSnippetTab(tab.id)}
                className={`h-7 px-3 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                  snippetTab === tab.id
                    ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                    : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleCopy(codeSnippets[snippetTab], `snippet_${snippetTab}`)}
              aria-label="Copy code snippet"
              className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedId === `snippet_${snippetTab}` ? (
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedId === `snippet_${snippetTab}` ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <pre className="p-3.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] overflow-x-auto leading-relaxed">
          <code>{codeSnippets[snippetTab]}</code>
        </pre>
      </div>
    </div>
  );
};
