import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CreditCard,
  Cpu,
  Settings,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Key,
  TrendingUp,
  RefreshCw,
  Sliders,
  Lock,
  Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { AdminStats, AiProvider, AiModel } from '../../types/index.ts';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  usage_limit: number;
  current_usage: number;
  created_at: string;
  subscription?: {
    id: string;
    plan_name: string;
    status: string;
    expires_at: string;
  } | null;
}

export const AdminPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'providers' | 'models' | 'settings'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForSub, setSelectedUserForSub] = useState<AdminUser | null>(null);
  const [grantPlanId, setGrantPlanId] = useState<'monthly' | 'yearly'>('monthly');
  const [grantDays, setGrantDays] = useState(30);

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');

  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Unauthorized Access</h2>
        <p className="text-xs text-gray-500 mt-1">
          This portal is restricted to authorized platform administrators.
        </p>
      </div>
    );
  }

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProvidersAndModels = async () => {
    if (!token) return;
    try {
      const [pRes, mRes, sRes] = await Promise.all([
        fetch('/api/admin/providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/models', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (pRes.ok) setProviders(await pRes.json());
      if (mRes.ok) setModels(await mRes.json());
      if (sRes.ok) setGlobalSettings(await sRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchProvidersAndModels();
  }, [token]);

  const handleToggleUserStatus = async (targetUser: AdminUser) => {
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchUsers();
        setFeedback(`User ${targetUser.name} status updated to ${newStatus}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserLimit = async (userId: string, newLimit: string) => {
    const parsed = parseInt(newLimit, 10);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ usage_limit: parsed })
      });
      if (res.ok) {
        fetchUsers();
        setFeedback('User token usage limit updated successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
        setFeedback('User successfully deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForSub) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForSub.id}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: grantPlanId,
          days: grantDays
        })
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
        setSelectedUserForSub(null);
        setFeedback('Subscription granted and activated successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProvider = async (providerId: string) => {
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          api_key: newApiKey || undefined,
          base_url: newBaseUrl || undefined
        })
      });
      if (res.ok) {
        fetchProvidersAndModels();
        setEditingProviderId(null);
        setNewApiKey('');
        setNewBaseUrl('');
        setFeedback('Provider configuration successfully updated.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleModel = async (model: AiModel) => {
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_enabled: !model.is_enabled })
      });
      if (res.ok) {
        fetchProvidersAndModels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(globalSettings)
      });
      if (res.ok) {
        setFeedback('Platform settings updated successfully.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <span>Admin Console</span>
              <span className="text-[10px] font-mono uppercase bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded">
                RBAC Active
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              User governance, subscription quotas, and AI provider credentials
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchUsers();
            fetchProvidersAndModels();
          }}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Analytics Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users & Quotas</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'providers'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Providers & Keys</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'models'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Models Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <span className="text-xs text-gray-400 block font-mono">TOTAL REGISTERED</span>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                {stats ? stats.totalUsers : '...'} users
              </p>
              <span className="text-[11px] text-gray-500">Active accounts</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <span className="text-xs text-gray-400 block font-mono">PAID SUBSCRIBERS</span>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {stats ? stats.activeSubscribers : '...'} users
              </p>
              <span className="text-[11px] text-gray-500">Gated workspace access</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <span className="text-xs text-gray-400 block font-mono">CUMULATIVE REVENUE</span>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1 font-mono">
                {stats ? formatBDT(stats.totalRevenue) : '...'}
              </p>
              <span className="text-[11px] text-gray-500">Settled via MFS & Cards</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <span className="text-xs text-gray-400 block font-mono">TOTAL TOKENS USED</span>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1 font-mono">
                {stats ? stats.totalTokensUsed.toLocaleString() : '...'}
              </p>
              <span className="text-[11px] text-gray-500">Prompt & response volume</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">
              Model Token Consumption Breakdown
            </h3>
            {stats && Object.keys(stats.modelUsageMap).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.modelUsageMap).map(([modelId, tokens]) => {
                  const m = models.find(mod => mod.id === modelId);
                  return (
                    <div key={modelId} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 dark:border-gray-800 font-mono">
                      <span className="font-sans font-medium text-gray-800 dark:text-gray-200">{m?.display_name || modelId}</span>
                      <span className="font-bold">{tokens.toLocaleString()} tokens</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No token activity recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <span className="text-xs text-gray-400 font-mono self-end sm:self-auto">
              Total Accounts: {users.length}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">User Profile</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Subscription</th>
                    <th className="py-2.5 px-4 font-medium">Tokens / Limit</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-gray-400">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-gray-500 font-mono">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.subscription ? (
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white block">{u.subscription.plan_name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Exp: {new Date(u.subscription.expires_at).toLocaleDateString('en-US')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{(u.current_usage || 0).toLocaleString()}</span>
                          <span className="text-gray-400">/</span>
                          <input
                            type="number"
                            defaultValue={u.usage_limit}
                            onBlur={e => handleUpdateUserLimit(u.id, e.target.value)}
                            className="w-20 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[11px] font-mono"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedUserForSub(u)}
                          className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                        >
                          Grant Plan
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grant Modal */}
          {selectedUserForSub && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-800 shadow-2xl">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Grant Subscription
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Target: <strong>{selectedUserForSub.name}</strong> ({selectedUserForSub.email})
                </p>

                <form onSubmit={handleGrantSubscription} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Plan Tier:</label>
                    <select
                      value={grantPlanId}
                      onChange={e => {
                        const val = e.target.value as 'monthly' | 'yearly';
                        setGrantPlanId(val);
                        setGrantDays(val === 'yearly' ? 365 : 30);
                      }}
                      className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <option value="monthly">Monthly Plan (30 Days)</option>
                      <option value="yearly">Yearly Plan (365 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Duration (Days):</label>
                    <input
                      type="number"
                      value={grantDays}
                      onChange={e => setGrantDays(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserForSub(null)}
                      className="px-3 py-1.5 rounded-lg border text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-bold text-xs"
                    >
                      Confirm & Grant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Providers */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
            <span>
              <strong>Server-Side Secret Isolation:</strong> Configured API keys are stored in encrypted server state and never transmitted to the browser client runtime.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-gray-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-gray-500 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Slug:</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{p.slug}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Active Key:</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      {p.api_key_masked || (p.slug === 'gemini' ? 'AI Studio Env Key (Active)' : 'Not Configured')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Base URL:</span>
                    <span className="truncate max-w-[180px]">{p.base_url || 'Default'}</span>
                  </div>
                </div>

                {editingProviderId === p.id ? (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <input
                      type="password"
                      placeholder="Enter new API key (sk-...)"
                      value={newApiKey}
                      onChange={e => setNewApiKey(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Custom Base URL (optional)"
                      value={newBaseUrl}
                      onChange={e => setNewBaseUrl(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingProviderId(null)}
                        className="px-2.5 py-1 rounded border text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveProvider(p.id)}
                        className="px-2.5 py-1 rounded bg-gray-950 text-white dark:bg-white dark:text-gray-950 text-xs font-semibold"
                      >
                        Save Key
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingProviderId(p.id);
                      setNewApiKey('');
                      setNewBaseUrl(p.base_url || '');
                    }}
                    className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 transition-colors"
                  >
                    Configure API Key
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Models */}
      {activeTab === 'models' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Model Name</th>
                  <th className="py-2.5 px-4 font-medium">Capability Badge</th>
                  <th className="py-2.5 px-4 font-medium">Context Window</th>
                  <th className="py-2.5 px-4 font-medium">Max Output</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {models.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{m.display_name}</div>
                      <div className="text-[10px] font-mono text-gray-400">{m.model_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-mono uppercase">
                        {m.badge}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{m.context_window.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{m.max_output_tokens.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        m.is_enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleModel(m)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          m.is_enabled
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {m.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4 max-w-xl text-xs">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
            Global Quotas & Support Contacts
          </h3>

          <div>
            <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Default Monthly Token Limit:</label>
            <input
              type="number"
              value={globalSettings.global_usage_limit || 50000}
              onChange={e => setGlobalSettings({ ...globalSettings, global_usage_limit: parseInt(e.target.value, 10) })}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Support Email:</label>
            <input
              type="email"
              value={globalSettings.support_email || 'support@bangla.ai'}
              onChange={e => setGlobalSettings({ ...globalSettings, support_email: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Support Phone:</label>
            <input
              type="text"
              value={globalSettings.support_phone || '+880 9612-000000'}
              onChange={e => setGlobalSettings({ ...globalSettings, support_phone: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 rounded-lg bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
