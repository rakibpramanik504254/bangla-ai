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
  Save,
  Clock,
  Check,
  X,
  Copy,
  Smartphone,
  ExternalLink,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { AdminStats, AiProvider, AiModel, Payment } from '../../types/index.ts';
import { trackMetaPurchase } from '../../utils/metaPixel.ts';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'providers' | 'models' | 'settings'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForSub, setSelectedUserForSub] = useState<AdminUser | null>(null);
  const [grantPlanId, setGrantPlanId] = useState<'monthly' | 'yearly'>('monthly');
  const [grantDays, setGrantDays] = useState(30);

  // Payments verification state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [openrouterQuickKey, setOpenrouterQuickKey] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingPixel, setTestingPixel] = useState(false);
  const [modelFilter, setModelFilter] = useState<'all' | 'flagship' | 'free'>('all');
  const [syncingFreeModels, setSyncingFreeModels] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [savingModelId, setSavingModelId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  const fetchPayments = async () => {
    if (!token) return;
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoadingPayments(false);
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
    if (!token || user?.role !== 'admin') return;
    fetchStats();
    fetchUsers();
    fetchPayments();
    fetchProvidersAndModels();
  }, [token, user?.role]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <Shield className="w-10 h-10 text-[#444746] dark:text-[#9aa0a6] mx-auto mb-3" />
        <h2 className="text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">Unauthorized Access</h2>
        <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-1 leading-[1.7]">
          This portal is restricted to authorized platform administrators.
        </p>
      </div>
    );
  }

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprovePayment = async (payment: Payment) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payment');

      // Trigger client-side Meta Pixel Purchase event as well
      trackMetaPurchase(
        payment.plan_name || (payment.plan_id === 'yearly' ? 'Yearly Plan (৳5,999)' : 'Monthly Plan (৳699)'),
        payment.amount,
        payment.trx_id,
        payment.gateway
      );

      setFeedback(`Payment approved! Subscription activated and Facebook Pixel Purchase event fired.`);
      fetchPayments();
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleRejectPayment = async (payment: Payment) => {
    if (!token) return;
    const note = window.prompt(
      'Enter reason for rejection (optional):',
      'Transaction ID or sender number could not be verified on MFS statement'
    );
    if (note === null) return; // user cancelled prompt

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payment');

      setFeedback(`Payment marked as rejected.`);
      fetchPayments();
      fetchStats();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleTestPixel = async () => {
    if (!token) return;
    setTestingPixel(true);
    try {
      const res = await fetch('/api/admin/pixel/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pixel test failed');
      setFeedback(data.message);
    } catch (err: any) {
      setFeedback(`Pixel Error: ${err.message}`);
    } finally {
      setTestingPixel(false);
    }
  };

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
      const trimmedKey = newApiKey.trim();
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          api_key: trimmedKey || undefined,
          base_url: newBaseUrl.trim() || undefined,
          ...(trimmedKey ? { is_active: true } : {})
        })
      });
      if (res.ok) {
        fetchProvidersAndModels();
        setEditingProviderId(null);
        setNewApiKey('');
        setNewBaseUrl('');
        setFeedback(
          trimmedKey
            ? 'Provider API key saved & Activated. Workspace models are now live.'
            : 'Provider configuration updated successfully.'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(`Error: ${err.error || 'Failed to save provider configuration.'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProviderActive = async (provider: AiProvider) => {
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !provider.is_active })
      });
      if (res.ok) {
        fetchProvidersAndModels();
        setFeedback(`${provider.name} is now ${!provider.is_active ? 'Active' : 'Paused'}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearProviderKey = async (provider: AiProvider) => {
    if (!window.confirm(`Remove saved API key for ${provider.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clear_api_key: true })
      });
      if (res.ok) {
        fetchProvidersAndModels();
        setFeedback(`API key removed for ${provider.name}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    if (!token) return;
    setTestingProviderId(providerId);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(
          editingProviderId === providerId && newApiKey.trim()
            ? { api_key: newApiKey.trim(), base_url: newBaseUrl.trim() || undefined }
            : {}
        )
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Provider connection test failed.'}`);
      } else {
        setFeedback(data.message || 'Connection test succeeded.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setTestingProviderId(null);
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
        body: JSON.stringify({
          is_enabled: !model.is_enabled
        })
      });
      if (res.ok) {
        fetchProvidersAndModels();
        setFeedback(`Model ${model.display_name} is now ${!model.is_enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartModelRename = (model: AiModel) => {
    setEditingModelId(model.id);
    setEditingModelName(model.display_name);
  };

  const handleSaveModelRename = async (modelId: string) => {
    const trimmed = editingModelName.trim();
    if (!trimmed) {
      setFeedback('Error: Model name cannot be empty.');
      return;
    }
    setSavingModelId(modelId);
    try {
      const res = await fetch(`/api/admin/models/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ display_name: trimmed })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to rename model.'}`);
        return;
      }
      setModels(prev => prev.map(m => (m.id === modelId ? { ...m, display_name: data.display_name || trimmed } : m)));
      setEditingModelId(null);
      setEditingModelName('');
      setFeedback(`Model renamed to "${data.display_name || trimmed}". Customers now see this name in Workspace.`);
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to rename model.'}`);
    } finally {
      setSavingModelId(null);
    }
  };

  const handleSyncFreeModels = async () => {
    if (!token) return;
    setSyncingFreeModels(true);
    try {
      const res = await fetch('/api/admin/models/sync-openrouter-free', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to sync OpenRouter free models.'}`);
      } else {
        if (Array.isArray(data.models)) {
          setModels(data.models);
        } else {
          fetchProvidersAndModels();
        }
        setFeedback(data.message || 'OpenRouter free models synced.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to sync OpenRouter free models.'}`);
    } finally {
      setSyncingFreeModels(false);
    }
  };

  const handleBulkToggleFreeModels = async (enableAll: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/models/free/toggle-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_enabled: enableAll })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to update OpenRouter free models.'}`);
      } else {
        if (Array.isArray(data.models)) {
          setModels(data.models);
        } else {
          fetchProvidersAndModels();
        }
        setFeedback(data.message || `All OpenRouter free models turned ${enableAll ? 'ON' : 'OFF'}.`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to update OpenRouter free models.'}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const trimmedQuickKey = openrouterQuickKey.trim();
      const payload = {
        ...globalSettings,
        ...(trimmedQuickKey
          ? { openrouter_api_key: trimmedQuickKey, openrouter_enabled: true }
          : {})
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setOpenrouterQuickKey('');
        fetchProvidersAndModels();
        setFeedback('Platform settings, OpenRouter API config, MFS numbers & Meta Pixel saved successfully.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const filteredPayments = payments.filter(p => {
    if (paymentFilter !== 'all' && p.status !== paymentFilter) return false;
    if (paymentSearch) {
      const q = paymentSearch.toLowerCase();
      return (
        p.trx_id.toLowerCase().includes(q) ||
        p.sender_number.includes(q) ||
        (p.user_name && p.user_name.toLowerCase().includes(q)) ||
        (p.user_email && p.user_email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-6">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
              Platform Administration
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] break-words">
              System Control Console
            </h1>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-[1.7]">
              MFS payment verification, Meta Pixel automation, users & AI model catalog
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchUsers();
            fetchPayments();
            fetchProvidersAndModels();
          }}
          className="self-start sm:self-auto h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 text-xs bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="text-[#1f1f1f] dark:text-[#e3e3e3] font-medium break-words">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-black/[0.08] dark:border-white/[0.08] pb-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 shrink-0" />
          <span>Payments Verification</span>
          {pendingPayments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-[#131314]">
              {pendingPayments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Users & Quotas</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'providers'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <Key className="w-3.5 h-3.5 shrink-0" />
          <span>Providers & Keys</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'models'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span>Models Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`min-h-8 sm:min-h-9 h-auto py-1.5 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
              : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          <span>Settings & Meta Pixel</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">Total Registered</span>
              <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1">
                {stats ? stats.totalUsers : '...'} users
              </p>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Active accounts</span>
            </div>

            <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">Paid Subscribers</span>
              <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1">
                {stats ? stats.activeSubscribers : '...'} subscribers
              </p>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Active workspace access</span>
            </div>

            <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">Cumulative Revenue</span>
              <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1 font-mono">
                {stats ? formatBDT(stats.totalRevenue) : '...'}
              </p>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">bKash, Nagad & Rocket</span>
            </div>

            <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">Pending Verification</span>
              <p className="text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {pendingPayments.length} payments
              </p>
              <button
                onClick={() => setActiveTab('payments')}
                className="text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3] font-medium hover:underline inline-block mt-0.5 cursor-pointer"
              >
                Review in Payments tab →
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e1f20] p-4 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
            <h3 className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] text-sm mb-4">
              Model Token Consumption Breakdown
            </h3>
            {stats && Object.keys(stats.modelUsageMap).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.modelUsageMap).map(([modelId, tokens]) => {
                  const m = models.find(mod => mod.id === modelId);
                  return (
                    <div key={modelId} className="flex flex-wrap items-center justify-between gap-2 text-xs py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] font-mono">
                      <span className="font-sans font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">{m?.display_name || modelId}</span>
                      <span className="font-semibold shrink-0">{tokens.toLocaleString()} tokens</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6]">No token activity recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Payments Verification (The core requested feature!) */}
      {activeTab === 'payments' && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={e => setPaymentSearch(e.target.value)}
                  placeholder="Search by TrxID, phone, or name..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1 bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.06] p-1 rounded-xl sm:rounded-full text-xs w-fit max-w-full">
                {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full capitalize text-xs font-semibold cursor-pointer transition-colors ${
                      paymentFilter === f
                        ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] shadow-2xs'
                        : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                    }`}
                  >
                    {f}
                    {f === 'pending' && pendingPayments.length > 0 && ` (${pendingPayments.length})`}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-[#444746] dark:text-[#9aa0a6] font-mono">
              Total Records: {filteredPayments.length}
            </span>
          </div>

          <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
            {loadingPayments ? (
              <div className="py-12 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">Loading payment records...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">No payment requests match your criteria.</div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
                  {filteredPayments.map(p => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">{p.user_name || 'Subscriber'}</div>
                          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] break-all">{p.user_email}</div>
                          <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono mt-0.5">
                            {new Date(p.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 shrink-0 ${
                          p.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : p.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'completed' ? 'bg-emerald-500' : p.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 bg-[#f0f4f9] dark:bg-[#131314] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
                        <div>
                          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] block">Gateway & Plan</span>
                          <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase">{p.gateway}</span>
                          <span className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6] block">{formatBDT(p.amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] block">Sender Number</span>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            <span>{p.sender_number}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(p.sender_number, `ph_m_${p.id}`)}
                              className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                              aria-label="Copy sender number"
                            >
                              {copiedId === `ph_m_${p.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] block mb-0.5">Transaction ID (TrxID)</span>
                          <div className="flex items-center justify-between gap-2 font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            <span className="break-all">{p.trx_id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(p.trx_id, `trx_m_${p.id}`)}
                              className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer shrink-0"
                              aria-label="Copy transaction ID"
                            >
                              {copiedId === `trx_m_${p.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleApprovePayment(p)}
                            className="flex-1 min-h-9 py-1.5 px-3 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
                            <span>Approve & Activate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPayment(p)}
                            className="min-h-9 py-1.5 px-3.5 rounded-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                          {p.status === 'completed' ? 'Verified & Active' : 'Rejected'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                      <tr>
                        <th className="py-3 px-4 font-medium">User Profile</th>
                        <th className="py-3 px-4 font-medium">MFS Gateway</th>
                        <th className="py-3 px-4 font-medium">Sender Number</th>
                        <th className="py-3 px-4 font-medium">Transaction ID (TrxID)</th>
                        <th className="py-3 px-4 font-medium">Plan & Amount</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Verification Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                      {filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-[#f0f4f9]/60 dark:hover:bg-[#282a2c]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">{p.user_name || 'Subscriber'}</div>
                            <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">{p.user_email}</div>
                            <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono">
                              {new Date(p.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase ${
                              p.gateway === 'bkash'
                                ? 'bg-pink-50 text-[#E2136E] dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900'
                                : p.gateway === 'nagad'
                                ? 'bg-orange-50 text-[#F7941D] dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900'
                                : 'bg-purple-50 text-[#8C3494] dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900'
                            }`}>
                              {p.gateway}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            <div className="flex items-center gap-1.5">
                              <span>{p.sender_number}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(p.sender_number, `ph_${p.id}`)}
                                className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                                title="Copy sender number"
                              >
                                {copiedId === `ph_${p.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] px-2.5 py-1 rounded-lg w-fit">
                              <span>{p.trx_id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(p.trx_id, `trx_${p.id}`)}
                                className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                                title="Copy TrxID to check MFS statement"
                              >
                                {copiedId === `trx_${p.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">{formatBDT(p.amount)}</div>
                            <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] capitalize">{p.plan_id} Plan</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 ${
                              p.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : p.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                p.status === 'completed' ? 'bg-emerald-500' : p.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              {p.status}
                            </span>
                            {p.admin_note && (
                              <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] mt-0.5 line-clamp-1">{p.admin_note}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {p.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(p)}
                                  className="h-8 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Approve payment, activate subscription and fire Meta Pixel Purchase event"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                                  <span>Approve & Activate</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRejectPayment(p)}
                                  className="h-8 px-2.5 rounded-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer transition-colors"
                                  title="Reject transaction if TrxID does not match"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                                {p.status === 'completed' ? 'Verified & Active' : 'Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
              />
            </div>
            <span className="text-xs text-[#444746] dark:text-[#9aa0a6] font-mono self-end sm:self-auto">
              Total Accounts: {users.length}
            </span>
          </div>

          <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
              {users.map(u => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">{u.name}</div>
                      <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] break-all">{u.email}</div>
                      {u.phone && <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono">{u.phone}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        u.role === 'admin'
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-bold'
                          : 'bg-[#f0f4f9] text-[#444746] dark:bg-[#282a2c] dark:text-[#e3e3e3]'
                      }`}>
                        {u.role}
                      </span>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase cursor-pointer ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {u.status}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 bg-[#f0f4f9] dark:bg-[#131314] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">Subscription</span>
                      {u.subscription ? (
                        <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {u.subscription.plan_name} (Exp: {new Date(u.subscription.expires_at).toLocaleDateString('en-US')})
                        </span>
                      ) : (
                        <span className="text-[#444746] dark:text-[#9aa0a6] italic">None</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">Tokens / Limit</span>
                      <div className="flex items-center gap-1.5">
                        <span>{(u.current_usage || 0).toLocaleString()}</span>
                        <span className="text-[#444746] dark:text-[#9aa0a6]">/</span>
                        <input
                          type="number"
                          defaultValue={u.usage_limit}
                          onBlur={e => handleUpdateUserLimit(u.id, e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[11px] font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedUserForSub(u)}
                      className="h-8 px-3.5 rounded-full text-xs border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-medium cursor-pointer transition-colors"
                    >
                      Grant Plan
                    </button>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="h-8 px-2.5 text-[#444746] dark:text-[#9aa0a6] hover:text-red-500 rounded-full border border-transparent hover:border-red-200 dark:hover:border-red-900 flex items-center gap-1 cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-medium">User Profile</th>
                    <th className="py-3 px-4 font-medium">Role</th>
                    <th className="py-3 px-4 font-medium">Subscription</th>
                    <th className="py-3 px-4 font-medium">Tokens / Limit</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[#f0f4f9]/60 dark:hover:bg-[#282a2c]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">{u.name}</div>
                        <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          u.role === 'admin'
                            ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-bold'
                            : 'bg-[#f0f4f9] text-[#444746] dark:bg-[#282a2c] dark:text-[#e3e3e3]'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.subscription ? (
                          <div>
                            <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] block">{u.subscription.plan_name}</span>
                            <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono">
                              Exp: {new Date(u.subscription.expires_at).toLocaleDateString('en-US')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#444746] dark:text-[#9aa0a6] italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{(u.current_usage || 0).toLocaleString()}</span>
                          <span className="text-[#444746] dark:text-[#9aa0a6]">/</span>
                          <input
                            type="number"
                            defaultValue={u.usage_limit}
                            onBlur={e => handleUpdateUserLimit(u.id, e.target.value)}
                            className="w-20 px-2 py-0.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[11px] font-mono"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedUserForSub(u)}
                          className="h-7 px-3 rounded-full text-xs border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-medium cursor-pointer transition-colors"
                        >
                          Grant Plan
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-[#444746] dark:text-[#9aa0a6] hover:text-red-500 rounded cursor-pointer"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#1e1f20] rounded-3xl p-6 max-w-sm w-full border border-black/[0.08] dark:border-white/[0.08] shadow-xl">
                <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                  Grant Subscription
                </h3>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mb-4">
                  Target: <strong>{selectedUserForSub.name}</strong> ({selectedUserForSub.email})
                </p>

                <form onSubmit={handleGrantSubscription} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Plan Tier:</label>
                    <select
                      value={grantPlanId}
                      onChange={e => {
                        const val = e.target.value as 'monthly' | 'yearly';
                        setGrantPlanId(val);
                        setGrantDays(val === 'yearly' ? 365 : 30);
                      }}
                      className="w-full p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3]"
                    >
                      <option value="monthly">Monthly Plan (30 Days)</option>
                      <option value="yearly">Yearly Plan (365 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Duration (Days):</label>
                    <input
                      type="number"
                      value={grantDays}
                      onChange={e => setGrantDays(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserForSub(null)}
                      className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs cursor-pointer"
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
          <div className="bg-[#f0f4f9] dark:bg-[#1e1f20] p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-xs text-[#444746] dark:text-[#9aa0a6] flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#1f1f1f] dark:text-[#e3e3e3]" />
            <span>
              <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Server-Side Secret Isolation:</strong> Configured API keys are stored strictly on the backend and never transmitted back to browser clients. Paste one <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">OpenRouter API Key</strong> below to power all 10 AI Workspace models automatically.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...providers]
              .sort((a, b) => (a.slug === 'openrouter' ? -1 : b.slug === 'openrouter' ? 1 : 0))
              .map(p => {
                const isOpenRouter = p.slug === 'openrouter';
                return (
                  <div
                    key={p.id}
                    className={`bg-white dark:bg-[#1e1f20] p-4 sm:p-6 rounded-2xl space-y-3 min-w-0 ${
                      isOpenRouter
                        ? 'md:col-span-2 border-2 border-[#1f1f1f] dark:border-[#e3e3e3]'
                        : 'border border-black/[0.08] dark:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Key className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] text-sm truncate">{p.name}</h3>
                          {isOpenRouter && (
                            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                              1 API Key = Access Claude, Gemini, GPT, DeepSeek, Grok &amp; Kimi in Workspace
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${
                            p.has_api_key
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]'
                          }`}
                        >
                          {p.has_api_key ? 'Key Saved' : 'Not Set'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleProviderActive(p)}
                          className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-semibold cursor-pointer ${
                            p.is_active
                              ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {p.is_active ? 'Active · Pause' : 'Paused · Activate'}
                        </button>
                      </div>
                    </div>

                    {p.has_api_key && !p.is_active && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          API key is saved, but this gateway is currently <strong>Paused</strong> and skipped in Workspace.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleProviderActive(p)}
                          className="h-7 px-3 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-[11px] cursor-pointer shrink-0"
                        >
                          Activate Now
                        </button>
                      </div>
                    )}

                    <div className="text-xs space-y-1.5 text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0">Slug:</span>
                        <span className="text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold truncate">{p.slug}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0">Base URL:</span>
                        <span className="text-[#444746] dark:text-[#9aa0a6] truncate max-w-[180px] sm:max-w-md">{p.base_url}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0">API Key:</span>
                        <span className="text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                          {p.api_key_masked || 'Not configured'}
                        </span>
                      </div>
                    </div>

                    {editingProviderId === p.id ? (
                      <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] mb-1">
                            {isOpenRouter ? 'OpenRouter API Key (sk-or-v1-...)' : `${p.name} API Key`}
                          </label>
                          <input
                            type="password"
                            placeholder={isOpenRouter ? 'sk-or-v1-...' : 'Enter new API Key...'}
                            value={newApiKey}
                            onChange={e => setNewApiKey(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] mb-1">
                            Base URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://openrouter.ai/api/v1"
                            value={newBaseUrl}
                            onChange={e => setNewBaseUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                          />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProviderId(null);
                              setNewApiKey('');
                              setNewBaseUrl('');
                            }}
                            className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          {isOpenRouter && (
                            <button
                              type="button"
                              disabled={testingProviderId === p.id}
                              onClick={() => handleTestProvider(p.id)}
                              className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {testingProviderId === p.id ? 'Testing...' : 'Test Key'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveProvider(p.id)}
                            className="h-8 px-4 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-xs cursor-pointer"
                          >
                            Save Key
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProviderId(p.id);
                            setNewApiKey('');
                            setNewBaseUrl(p.base_url || '');
                          }}
                          className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>{p.has_api_key ? 'Update Key' : 'Add API Key'}</span>
                        </button>
                        {isOpenRouter && p.has_api_key && (
                          <button
                            type="button"
                            disabled={testingProviderId === p.id}
                            onClick={() => handleTestProvider(p.id)}
                            className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {testingProviderId === p.id ? 'Testing...' : 'Verify Connection'}
                          </button>
                        )}
                        {p.has_api_key && (
                          <button
                            type="button"
                            onClick={() => handleClearProviderKey(p)}
                            className="h-8 px-3 rounded-full text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 4: Models */}
      {activeTab === 'models' && (() => {
        const isFreeModel = (m: AiModel) =>
          Boolean(m.is_free || m.badge === 'free' || m.model_name.endsWith(':free') || m.model_name === 'openrouter/free');
        const freeModelsList = models.filter(isFreeModel);
        const freeOnCount = freeModelsList.filter(m => m.is_enabled).length;
        const flagshipModelsList = models.filter(m => !isFreeModel(m));
        const visibleModels =
          modelFilter === 'free' ? freeModelsList :
          modelFilter === 'flagship' ? flagshipModelsList : models;

        return (
          <div className="space-y-4">
            {/* Free Models Toolbar & Filter Controls */}
            <div className="bg-white dark:bg-[#1e1f20] p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setModelFilter('all')}
                  className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
                    modelFilter === 'all'
                      ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                  }`}
                >
                  All Models ({models.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModelFilter('flagship')}
                  className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
                    modelFilter === 'flagship'
                      ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                  }`}
                >
                  Flagship ({flagshipModelsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModelFilter('free')}
                  className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
                    modelFilter === 'free'
                      ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                  }`}
                >
                  OpenRouter Free ({freeOnCount}/{freeModelsList.length} ON)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={syncingFreeModels}
                  onClick={handleSyncFreeModels}
                  className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFreeModels ? 'animate-spin' : ''}`} />
                  <span>{syncingFreeModels ? 'Syncing...' : 'Sync Free Models'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleFreeModels(true)}
                  className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Turn All Free ON
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleFreeModels(false)}
                  className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[#444746] dark:text-[#9aa0a6] hover:text-red-600 font-semibold cursor-pointer"
                >
                  Turn All Free OFF
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
                {visibleModels.map(m => (
                  <div key={m.id} className="p-4 space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {editingModelId === m.id ? (
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              handleSaveModelRename(m.id);
                            }}
                            className="flex flex-wrap items-center gap-1.5 mb-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingModelName}
                              onChange={e => setEditingModelName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Escape') {
                                  setEditingModelId(null);
                                  setEditingModelName('');
                                }
                              }}
                              aria-label={`New name for ${m.display_name}`}
                              className="flex-1 min-w-[140px] px-2.5 py-1 rounded-lg border border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={savingModelId === m.id}
                              aria-label="Save model name"
                              className="h-7 px-2.5 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              {savingModelId === m.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingModelId(null);
                                setEditingModelName('');
                              }}
                              aria-label="Cancel rename"
                              className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] break-words">{m.display_name}</div>
                            <button
                              type="button"
                              onClick={() => handleStartModelRename(m)}
                              aria-label={`Rename ${m.display_name}`}
                              title="Rename model for customers"
                              className="p-1 text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] rounded cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] break-all">{m.openrouter_model_id || m.model_name}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold shrink-0 ${
                        isFreeModel(m)
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                      }`}>
                        {isFreeModel(m) ? 'FREE' : m.badge}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                      <span>Ctx: {m.context_window.toLocaleString()}</span>
                      <span>Out: {m.max_output_tokens.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        m.is_enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]'
                      }`}>
                        {m.is_enabled ? 'ON in Workspace' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.is_enabled}
                        aria-label={`Toggle ${m.display_name}`}
                        onClick={() => handleToggleModel(m)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          m.is_enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            m.is_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Model Name &amp; Slug</th>
                      <th className="py-3 px-4 font-medium">Tier</th>
                      <th className="py-3 px-4 font-medium">Context Window</th>
                      <th className="py-3 px-4 font-medium">Max Output</th>
                      <th className="py-3 px-4 font-medium">Workspace Status</th>
                      <th className="py-3 px-4 font-medium text-right">ON / OFF Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {visibleModels.map(m => (
                      <tr key={m.id} className="hover:bg-[#f0f4f9]/60 dark:hover:bg-[#282a2c]/60 transition-colors">
                        <td className="py-3 px-4">
                          {editingModelId === m.id ? (
                            <form
                              onSubmit={e => {
                                e.preventDefault();
                                handleSaveModelRename(m.id);
                              }}
                              className="flex items-center gap-1.5 mb-1"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editingModelName}
                                onChange={e => setEditingModelName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') {
                                    setEditingModelId(null);
                                    setEditingModelName('');
                                  }
                                }}
                                aria-label={`New name for ${m.display_name}`}
                                className="w-60 px-2.5 py-1 rounded-lg border border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={savingModelId === m.id}
                                aria-label="Save model name"
                                className="h-7 px-2.5 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>{savingModelId === m.id ? 'Saving...' : 'Save'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingModelId(null);
                                  setEditingModelName('');
                                }}
                                aria-label="Cancel rename"
                                className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">{m.display_name}</span>
                              <button
                                type="button"
                                onClick={() => handleStartModelRename(m)}
                                aria-label={`Rename ${m.display_name}`}
                                title="Rename model for customers"
                                className="px-2 py-0.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[10px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Edit className="w-2.5 h-2.5" />
                                <span>Rename</span>
                              </button>
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">{m.openrouter_model_id || m.model_name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                            isFreeModel(m)
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                          }`}>
                            {isFreeModel(m) ? 'FREE' : m.badge}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{m.context_window.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono">{m.max_output_tokens.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                            m.is_enabled
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]'
                          }`}>
                            {m.is_enabled ? 'ON in Workspace' : 'OFF'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={m.is_enabled}
                            aria-label={`Toggle ${m.display_name}`}
                            onClick={() => handleToggleModel(m)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              m.is_enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                m.is_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 5: Settings & Facebook Pixel (The requested Meta Pixel setting!) */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-[#1e1f20] p-4 sm:p-8 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-6 max-w-2xl text-xs">
          <div>
            <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
              Global Platform, OpenRouter API, Payment &amp; Meta Pixel Settings
            </h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-[1.7]">
              Configure OpenRouter unified AI gateway, system quotas, MFS numbers, and Facebook Pixel.
            </p>
          </div>

          {/* OpenRouter Unified Gateway Quick Section */}
          <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Key className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                  OpenRouter Unified API (All Workspace Models)
                </h4>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={globalSettings.openrouter_enabled !== false}
                  onChange={e => setGlobalSettings({ ...globalSettings, openrouter_enabled: e.target.checked })}
                  className="rounded w-4 h-4 text-[#1f1f1f] cursor-pointer"
                />
                <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">Active</span>
              </label>
            </div>

            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Enter one OpenRouter API key (<span className="font-mono">sk-or-v1-...</span>) to power all 10 models in the AI Workspace (Claude, Gemini, GPT, DeepSeek, Grok &amp; Kimi).
            </p>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                  OpenRouter API Key:
                </label>
                {globalSettings.openrouter_configured && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    Saved: {globalSettings.openrouter_key_masked}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={openrouterQuickKey}
                onChange={e => {
                  const val = e.target.value;
                  setOpenrouterQuickKey(val);
                  if (val.trim()) {
                    setGlobalSettings((prev: any) => ({ ...prev, openrouter_enabled: true }));
                  }
                }}
                placeholder={globalSettings.openrouter_configured ? 'Enter new key to replace saved key...' : 'sk-or-v1-...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
              {globalSettings.openrouter_configured && globalSettings.openrouter_enabled === false && (
                <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  OpenRouter key is saved, but "Active" is currently unchecked. Check "Active" above and save to enable live AI responses.
                </p>
              )}
            </div>
          </div>

          {/* Facebook Pixel Setup Section */}
          <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Activity className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Facebook / Meta Pixel Setup (Meta Ads)
                </h4>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!globalSettings.facebook_pixel_enabled}
                  onChange={e => setGlobalSettings({ ...globalSettings, facebook_pixel_enabled: e.target.checked })}
                  className="rounded w-4 h-4 text-[#1f1f1f] cursor-pointer"
                />
                <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">Enable Pixel</span>
              </label>
            </div>

            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              When enabled, Bangla AI automatically tracks PageView, InitiateCheckout, AddPaymentInfo on payment submission, and fires the <strong>Purchase</strong> event with exact BDT conversion value when admin approves bKash, Nagad, or Rocket payments.
            </p>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                Meta Pixel ID:
              </label>
              <input
                type="text"
                value={globalSettings.facebook_pixel_id || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, facebook_pixel_id: e.target.value.trim() })}
                placeholder="e.g. 123456789012345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block mt-1">
                Found in Meta Events Manager &gt; Data Sources &gt; Pixel Settings.
              </span>
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                Meta Conversions API (CAPI) Access Token (Server-Side Tracking):
              </label>
              <input
                type="password"
                value={globalSettings.facebook_pixel_access_token || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, facebook_pixel_access_token: e.target.value.trim() })}
                placeholder="EAAB..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block mt-1">
                Generates 100% reliable server-to-server Purchase events even if users use ad-blockers.
              </span>
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                Test Event Code (Optional for Meta Testing):
              </label>
              <input
                type="text"
                value={globalSettings.facebook_pixel_test_code || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, facebook_pixel_test_code: e.target.value.trim() })}
                placeholder="e.g. TEST12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={testingPixel || !globalSettings.facebook_pixel_id}
                onClick={handleTestPixel}
                className="min-h-8 h-auto py-1.5 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-white dark:hover:bg-[#282a2c] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                <span>{testingPixel ? 'Sending Test...' : 'Send Test Purchase Event'}</span>
              </button>
              <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                Check Meta Events Manager &gt; Test Events tab.
              </span>
            </div>
          </div>

          {/* MFS Payment Numbers Configuration */}
          <div className="pt-2 border-t border-black/[0.08] dark:border-white/[0.08] space-y-3.5">
            <div>
              <h4 className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] flex flex-wrap items-center justify-between gap-2">
                <span>MFS Payment Phone Numbers</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Live in Checkout
                </span>
              </h4>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                These numbers are dynamically displayed to subscribers during checkout with 1-click copy.
              </p>
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                bKash Merchant / Personal Number:
              </label>
              <input
                type="text"
                value={globalSettings.bkash_number || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, bkash_number: e.target.value })}
                placeholder="01812345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                Nagad Merchant / Personal Number:
              </label>
              <input
                type="text"
                value={globalSettings.nagad_number || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, nagad_number: e.target.value })}
                placeholder="01712345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
                Rocket Merchant / Personal Number:
              </label>
              <input
                type="text"
                value={globalSettings.rocket_number || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, rocket_number: e.target.value })}
                placeholder="01912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-black/[0.08] dark:border-white/[0.08] space-y-3.5">
            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Default Monthly Token Limit:</label>
              <input
                type="number"
                value={globalSettings.global_usage_limit || 1000000}
                onChange={e => setGlobalSettings({ ...globalSettings, global_usage_limit: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Support Email:</label>
              <input
                type="email"
                value={globalSettings.support_email || 'ourbangla.ai@gmail.com'}
                onChange={e => setGlobalSettings({ ...globalSettings, support_email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Support Phone:</label>
              <input
                type="text"
                value={globalSettings.support_phone || '+880 1622-860128'}
                onChange={e => setGlobalSettings({ ...globalSettings, support_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">Facebook Page Link:</label>
              <input
                type="text"
                value={globalSettings.facebook_page_url || 'https://www.facebook.com/profile.php?id=61596472081766'}
                onChange={e => setGlobalSettings({ ...globalSettings, facebook_page_url: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                placeholder="https://www.facebook.com/..."
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full sm:w-auto h-10 px-6 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings & Pixel'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
