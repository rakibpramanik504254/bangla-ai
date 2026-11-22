import React, { useCallback, useEffect, useState } from 'react';
import {
  Edit,
  Key,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import type { DeveloperApiKey } from '../../types/index.ts';

interface DeveloperApiAdminTabProps {
  token: string | null;
  setFeedback: (msg: string | null) => void;
}

interface AdminSummary {
  totalKeys: number;
  activeKeys: number;
  totalCreditsRemaining: number;
  requestsToday: number;
  totalRequestsAllTime: number;
}

export const DeveloperApiAdminTab: React.FC<DeveloperApiAdminTabProps> = ({
  token,
  setFeedback,
}) => {
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [summary, setSummary] = useState<AdminSummary>({
    totalKeys: 0,
    activeKeys: 0,
    totalCreditsRemaining: 0,
    requestsToday: 0,
    totalRequestsAllTime: 0,
  });
  const [defaultDailyLimit, setDefaultDailyLimit] = useState('50');
  const [defaultCredits, setDefaultCredits] = useState('50');
  const [baseUrl, setBaseUrl] = useState('https://bangla-ai.pro/api/v1');

  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<DeveloperApiKey | null>(null);
  const [editCredits, setEditCredits] = useState('0');
  const [editDailyLimit, setEditDailyLimit] = useState('50');
  const [editResetDaily, setEditResetDaily] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/developer-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load Developer API keys.');
      }
      setBaseUrl(data.baseUrl || 'https://bangla-ai.pro/api/v1');
      if (data.settings) {
        setDefaultDailyLimit(String(data.settings.api_default_daily_limit ?? 50));
        setDefaultCredits(String(data.settings.api_default_credits ?? 50));
      }
      if (data.summary) {
        setSummary(data.summary);
      }
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Failed to load Developer API keys.'}`);
    } finally {
      setLoading(false);
    }
  }, [token, setFeedback]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || savingDefaults) return;
    const dailyNum = Number(defaultDailyLimit);
    const creditsNum = Number(defaultCredits);
    if (!Number.isFinite(dailyNum) || dailyNum < 1) {
      setFeedback('Error: Default daily request limit must be at least 1.');
      return;
    }
    if (!Number.isFinite(creditsNum) || creditsNum < 0) {
      setFeedback('Error: Default starting credits must be 0 or higher.');
      return;
    }

    setSavingDefaults(true);
    try {
      const res = await fetch('/api/admin/developer-keys/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          api_default_daily_limit: Math.floor(dailyNum),
          api_default_credits: Math.floor(creditsNum),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save default limits.');
      }
      setFeedback(
        `Developer API defaults updated: ${data.settings.api_default_daily_limit} req/day and ${data.settings.api_default_credits} starting credits for new keys.`
      );
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Failed to save defaults.'}`);
    } finally {
      setSavingDefaults(false);
    }
  };

  const patchKey = async (
    keyId: string,
    payload: {
      is_enabled?: boolean;
      credits?: number;
      add_credits?: number;
      daily_limit?: number;
      reset_daily_usage?: boolean;
    },
    successMessage: string
  ) => {
    if (!token || busyKeyId) return;
    setBusyKeyId(keyId);
    try {
      const res = await fetch(`/api/admin/developer-keys/${encodeURIComponent(keyId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update API key.');
      }
      setFeedback(successMessage);
      await loadData();
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Failed to update API key.'}`);
    } finally {
      setBusyKeyId(null);
    }
  };

  const handleOpenEdit = (key: DeveloperApiKey) => {
    setEditingKey(key);
    setEditCredits(String(key.credits));
    setEditDailyLimit(String(key.daily_limit));
    setEditResetDaily(false);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;
    const creditsNum = Number(editCredits);
    const limitNum = Number(editDailyLimit);
    if (!Number.isFinite(creditsNum) || creditsNum < 0) {
      setFeedback('Error: Credits must be 0 or higher.');
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum < 0) {
      setFeedback('Error: Daily request limit must be 0 or higher.');
      return;
    }

    const target = editingKey;
    setEditingKey(null);
    await patchKey(
      target.id,
      {
        credits: Math.floor(creditsNum),
        daily_limit: Math.floor(limitNum),
        reset_daily_usage: editResetDaily,
      },
      `Updated "${target.name}" (${Math.floor(creditsNum)} credits, ${Math.floor(limitNum)}/day limit).`
    );
  };

  const handleDeleteKey = async (keyId: string, label: string) => {
    if (!token || busyKeyId) return;
    setBusyKeyId(keyId);
    try {
      const res = await fetch(`/api/admin/developer-keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete API key.');
      }
      setConfirmDeleteId(null);
      setFeedback(`Deleted API key "${label}".`);
      await loadData();
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Could not delete API key.'}`);
    } finally {
      setBusyKeyId(null);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredKeys = keys.filter((k) => {
    if (statusFilter === 'active' && !k.is_enabled) return false;
    if (statusFilter === 'disabled' && k.is_enabled) return false;
    if (!normalizedQuery) return true;
    return (
      (k.user_name || '').toLowerCase().includes(normalizedQuery) ||
      (k.user_email || '').toLowerCase().includes(normalizedQuery) ||
      k.name.toLowerCase().includes(normalizedQuery) ||
      k.key_prefix.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in" data-testid="admin-tab-developer-api">
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Total User Keys</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] mt-1">
            {summary.totalKeys.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
            {summary.activeKeys} enabled
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Requests Today</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] mt-1">
            {summary.requestsToday.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
            {summary.totalRequestsAllTime.toLocaleString()} all-time
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Total Remaining Credits</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] mt-1">
            {summary.totalCreditsRemaining.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
            Across all user keys
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Public Endpoint</div>
          <div className="text-xs font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mt-1.5 truncate">
            {baseUrl}
          </div>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-1">
            1 credit / completion
          </div>
        </div>
      </div>

      {/* Default Daily Limit & Starting Credits Control Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
              <span>Default Limits for New API Keys</span>
            </h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5">
              Applied automatically whenever a user generates a new <code className="font-mono">sk-banglaai-...</code> key.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveDefaults} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label
              htmlFor="admin-default-daily-limit"
              className="block text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
            >
              Default Daily Request Limit
            </label>
            <input
              id="admin-default-daily-limit"
              type="number"
              min={1}
              max={1000000}
              value={defaultDailyLimit}
              onChange={(e) => setDefaultDailyLimit(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-default-credits"
              className="block text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
            >
              Default Starting Credits
            </label>
            <input
              id="admin-default-credits"
              type="number"
              min={0}
              max={10000000}
              value={defaultCredits}
              onChange={(e) => setDefaultCredits(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
            />
          </div>

          <button
            type="submit"
            disabled={savingDefaults}
            data-testid="admin-save-api-defaults-btn"
            className="h-10 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingDefaults ? 'Saving...' : 'Save Defaults'}</span>
          </button>
        </form>
      </div>

      {/* User Keys Management Table */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${keys.length})` },
                { id: 'active', label: `Active (${keys.filter((k) => k.is_enabled).length})` },
                { id: 'disabled', label: `Disabled (${keys.filter((k) => !k.is_enabled).length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`h-7 px-3 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                  statusFilter === f.id
                    ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                    : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#444746] dark:text-[#9aa0a6]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, email, or key..."
                className="w-full h-8 pl-8 pr-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3]"
              />
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              aria-label="Refresh Developer API keys"
              className="h-8 w-8 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center justify-center cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
            Loading user API keys...
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-1.5">
            <Key className="w-6 h-6 mx-auto text-[#444746]/50 dark:text-[#9aa0a6]/50" />
            <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              No matching API keys found
            </p>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              When users create keys from Account &amp; Billing → API Keys, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#131314]/60 text-[10.5px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                  <th className="py-2.5 px-4">User &amp; Key</th>
                  <th className="py-2.5 px-4">Credits</th>
                  <th className="py-2.5 px-4">Daily Usage</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {filteredKeys.map((k) => {
                  const isBusy = busyKeyId === k.id;
                  return (
                    <tr
                      key={k.id}
                      data-testid={`admin-api-key-row-${k.id}`}
                      className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#282a2c]/30"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {k.user_name || 'User'}
                        </div>
                        <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                          {k.user_email || k.user_id}
                        </div>
                        <div className="text-[11px] font-mono text-[#444746] dark:text-[#c4c7c5] mt-0.5">
                          {k.name} · <span className="opacity-80">{k.key_prefix}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {k.credits.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              patchKey(
                                k.id,
                                { add_credits: 50 },
                                `Added +50 credits to "${k.name}".`
                              )
                            }
                            className="h-6 px-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[10px] font-mono font-semibold inline-flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>50</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              patchKey(
                                k.id,
                                { add_credits: 200 },
                                `Added +200 credits to "${k.name}".`
                              )
                            }
                            className="h-6 px-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[10px] font-mono font-semibold inline-flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>200</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold">
                          {k.daily_requests_used} / {k.daily_limit}
                        </div>
                        <div className="text-[10.5px] text-[#444746] dark:text-[#9aa0a6]">
                          Total: {k.total_requests.toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          aria-label={`${k.is_enabled ? 'Disable' : 'Enable'} API key ${k.name}`}
                          onClick={() =>
                            patchKey(
                              k.id,
                              { is_enabled: !k.is_enabled },
                              `API key "${k.name}" ${!k.is_enabled ? 'enabled' : 'disabled'}.`
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold uppercase cursor-pointer border transition-colors disabled:opacity-50 ${
                            k.is_enabled
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800'
                          }`}
                        >
                          {k.is_enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleOpenEdit(k)}
                            aria-label={`Edit limits for ${k.name}`}
                            className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === k.id ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteKey(k.id, k.name)}
                                className="h-7 px-2.5 rounded-full bg-red-600 text-white text-[10.5px] font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="h-7 px-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[10.5px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={`Delete API key ${k.name}`}
                              onClick={() => setConfirmDeleteId(k.id)}
                              className="p-1.5 rounded-lg text-[#444746] dark:text-[#9aa0a6] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Key Credits & Daily Limit Modal */}
      {editingKey && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit API Key Credits and Limits"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setEditingKey(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#1e1f20] rounded-3xl p-6 max-w-sm w-full border border-black/[0.08] dark:border-white/[0.08] shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Edit API Key Quota
                </h3>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                  <strong>{editingKey.user_name || editingKey.user_email}</strong> · {editingKey.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={() => setEditingKey(null)}
                className="p-1 rounded-full text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor="edit-key-credits"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Total Remaining Credits
                </label>
                <input
                  id="edit-key-credits"
                  type="number"
                  min={0}
                  max={10000000}
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-key-daily-limit"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Daily Request Limit
                </label>
                <input
                  id="edit-key-daily-limit"
                  type="number"
                  min={0}
                  max={1000000}
                  value={editDailyLimit}
                  onChange={(e) => setEditDailyLimit(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[#444746] dark:text-[#c4c7c5]">
                <input
                  type="checkbox"
                  checked={editResetDaily}
                  onChange={(e) => setEditResetDaily(e.target.checked)}
                  className="rounded"
                />
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Reset today&apos;s request counter to 0 (currently {editingKey.daily_requests_used})</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
