import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CreditCard,
  Cpu,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Key,
  TrendingUp,
  RefreshCw,
  Lock,
  Save,
  Check,
  Copy,
  Smartphone,
  Activity,
  Wallet,
  Mail,
  Globe,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { AdminStats, AiProvider, AiModel, Payment } from '../../types/index.ts';
import { isFreeAiModel } from '../../utils/modelTier.ts';
import {
  ADMIN_NAV_GROUPS,
  type AdminSectionId,
  getAdminNavItem
} from '../../utils/adminConsoleNav.ts';
import { MoneyManagementTab } from './MoneyManagementTab.tsx';
import { ModelsCatalogTab } from './ModelsCatalogTab.tsx';
import {
  MfsGatewaysTab,
  MetaPixelTab,
  EmailSystemTab,
  SeoAndSupportTab
} from './AdminSettingsTabs.tsx';
import { OpenRouterUsageCard } from './OpenRouterUsageCard.tsx';
import { DeveloperApiAdminTab } from './DeveloperApiAdminTab.tsx';
import {
  validateGa4MeasurementId,
  validateGscVerificationCode
} from '../../utils/technicalSeo.ts';

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

const SECTION_ICONS: Record<AdminSectionId, React.ComponentType<{ className?: string }>> = {
  overview: TrendingUp,
  payments: CreditCard,
  mfs: Smartphone,
  finance: Wallet,
  models: Cpu,
  providers: Key,
  developer_api: Terminal,
  users: Users,
  pixel: Activity,
  email: Mail,
  seo: Globe
};

export const AdminPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [openRouterRefreshSignal, setOpenRouterRefreshSignal] = useState(0);

  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [mailWebhookInput, setMailWebhookInput] = useState('');
  const [mailSecretInput, setMailSecretInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingPixel, setTestingPixel] = useState(false);
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

  const handleSelectSection = (id: AdminSectionId) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprovePayment = async (payment: Payment) => {
    if (!token || approvingPaymentId === payment.id) return;
    setApprovingPaymentId(payment.id);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payment');

      const capiNote = data.pixelFired
        ? ` Meta CAPI Purchase event delivered (${data.pixelEventId || 'deduplicated'}).`
        : ' (Meta CAPI skipped — enable Pixel & Access Token in Meta Pixel settings to send server Purchase events.)';
      const baseMsg =
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : payment.plan_id === 'developer_api'
          ? 'Payment approved! Developer API Key creation unlocked.'
          : 'Payment approved! Subscription activated.';
      setFeedback(`${baseMsg}${capiNote}`);
      fetchPayments();
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setApprovingPaymentId(null);
    }
  };

  const handleRejectPayment = async (payment: Payment) => {
    if (!token) return;
    const note = window.prompt(
      'Enter reason for rejection (optional):',
      'Transaction ID or sender number could not be verified on MFS statement'
    );
    if (note === null) return;

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
        setOpenRouterRefreshSignal(v => v + 1);
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
        setOpenRouterRefreshSignal(v => v + 1);
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
        setOpenRouterRefreshSignal(v => v + 1);
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
        setOpenRouterRefreshSignal(v => v + 1);
        setFeedback(data.message || 'Connection test succeeded.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setTestingProviderId(null);
    }
  };

  const saveSettingsSection = async (
    payload: Record<string, any>,
    successMessage: string,
    clearMailInputs = false
  ) => {
    if (!token) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to update settings.'}`);
        return;
      }
      if (clearMailInputs) {
        setMailWebhookInput('');
        setMailSecretInput('');
      }
      setGlobalSettings(data);
      fetchProvidersAndModels();
      setFeedback(successMessage);
    } catch (err) {
      console.error(err);
      setFeedback('Error: Network error while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMfsNumbers = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsSection(
      {
        bkash_number: globalSettings.bkash_number || '',
        nagad_number: globalSettings.nagad_number || '',
        rocket_number: globalSettings.rocket_number || ''
      },
      'MFS receiving numbers saved and synced to live checkout.'
    );
  };

  const handleSaveQuotaSetting = (e: React.FormEvent) => {
    e.preventDefault();
    const limitVal = Number(globalSettings.global_usage_limit);
    if (!Number.isFinite(limitVal) || limitVal < 1000) {
      setFeedback('Error: Default monthly token limit must be at least 1,000.');
      return;
    }
    saveSettingsSection(
      { global_usage_limit: Math.round(limitVal) },
      'Default monthly token quota updated for new user accounts.'
    );
  };

  const handleSavePixelSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsSection(
      {
        facebook_pixel_enabled: !!globalSettings.facebook_pixel_enabled,
        facebook_pixel_id: globalSettings.facebook_pixel_id || '',
        facebook_pixel_access_token: globalSettings.facebook_pixel_access_token || '',
        facebook_pixel_test_code: globalSettings.facebook_pixel_test_code || ''
      },
      'Meta Pixel & Conversions API settings saved successfully.'
    );
  };

  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMailWebhook = mailWebhookInput.trim();
    const trimmedMailSecret = mailSecretInput.trim();
    saveSettingsSection(
      {
        mail_enabled: globalSettings.mail_enabled !== false,
        mail_notify_admin_on_payment: globalSettings.mail_notify_admin_on_payment !== false,
        ...(trimmedMailWebhook
          ? { mail_webhook_url: trimmedMailWebhook, mail_enabled: true }
          : {}),
        ...(trimmedMailSecret ? { mail_webhook_secret: trimmedMailSecret } : {})
      },
      'Automated Email System configuration saved.',
      true
    );
  };

  const handleSaveSeoAndSupport = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsSection(
      {
        seo_title: globalSettings.seo_title,
        seo_description: globalSettings.seo_description,
        seo_og_image_url: globalSettings.seo_og_image_url,
        support_email: globalSettings.support_email || 'ourbangla.ai@gmail.com',
        support_phone: globalSettings.support_phone || '+880 1878-242764',
        facebook_page_url: globalSettings.facebook_page_url || ''
      },
      'SEO metadata & public support contacts saved successfully.'
    );
  };

  const handleSaveTechnicalSeo = (e: React.FormEvent) => {
    e.preventDefault();
    const gscCheck = validateGscVerificationCode(globalSettings.gsc_verification_code || '');
    if (!gscCheck.valid) {
      setFeedback(`Error: ${gscCheck.error}`);
      return;
    }
    const ga4Check = validateGa4MeasurementId(globalSettings.ga4_measurement_id || '');
    if (!ga4Check.valid) {
      setFeedback(`Error: ${ga4Check.error}`);
      return;
    }
    if (globalSettings.ga4_enabled && !ga4Check.measurementId) {
      setFeedback('Error: Enter a valid GA4 Measurement ID (G-XXXXXXXXXX) before enabling GA4.');
      return;
    }

    saveSettingsSection(
      {
        gsc_verification_code: gscCheck.code,
        ga4_measurement_id: ga4Check.measurementId,
        ga4_enabled: Boolean(globalSettings.ga4_enabled && ga4Check.measurementId),
        robots_txt_extra: String(globalSettings.robots_txt_extra || '')
      },
      'Technical SEO Engine settings (GSC, GA4 & Robots.txt) saved and live!'
    );
  };

  const handleToggleMfsGateway = async (
    key: 'bkash_enabled' | 'nagad_enabled' | 'rocket_enabled',
    label: string
  ) => {
    if (!token) return;
    const currentlyEnabled = globalSettings[key] !== false;
    const nextValue = !currentlyEnabled;

    const nextBkash = key === 'bkash_enabled' ? nextValue : globalSettings.bkash_enabled !== false;
    const nextNagad = key === 'nagad_enabled' ? nextValue : globalSettings.nagad_enabled !== false;
    const nextRocket = key === 'rocket_enabled' ? nextValue : globalSettings.rocket_enabled !== false;

    if (!nextBkash && !nextNagad && !nextRocket) {
      setFeedback('Error: At least one payment method (bKash, Nagad, or Rocket) must stay enabled.');
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: nextValue })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || `Failed to update ${label} status.`}`);
        return;
      }
      setGlobalSettings(data);
      setFeedback(
        nextValue
          ? `${label} enabled — now visible to customers in Checkout.`
          : `${label} turned OFF — hidden from Checkout payment methods.`
      );
    } catch (err) {
      console.error(err);
      setFeedback(`Error: Network error while updating ${label} status.`);
    }
  };

  const activeNavItem = getAdminNavItem(activeTab);
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

  const paidModelsList = models.filter(m => !isFreeAiModel(m));
  const paidOnCount = paidModelsList.filter(m => m.is_enabled).length;
  const freeModelsList = models.filter(m => isFreeAiModel(m));
  const freeOnCount = freeModelsList.filter(m => m.is_enabled).length;
  const openrouterProvider = providers.find(p => p.slug === 'openrouter');

  const quickMobileTabs: AdminSectionId[] = ['overview', 'payments', 'mfs', 'models', 'providers', 'users'];
  const isErrorFeedback = feedback?.toLowerCase().startsWith('error') || feedback?.toLowerCase().includes('error:');

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#f0f4f9]/65 dark:bg-[#131314]">
      <div className="max-w-[1380px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* Desktop WordPress-Inspired Sidebar Navigation */}
        <aside
          aria-label="Admin Console Navigation"
          data-testid="admin-sidebar-nav"
          className="hidden lg:flex lg:flex-col w-60 shrink-0 sticky top-20 bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden"
        >
          <div className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                Bangla AI Admin
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                Control Console
              </div>
            </div>
          </div>

          <nav className="p-2.5 space-y-4">
            {ADMIN_NAV_GROUPS.map(group => (
              <div key={group.id} className="space-y-1">
                <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = SECTION_ICONS[item.id];
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSection(item.id)}
                        data-testid={item.id === 'finance' ? 'admin-tab-finance' : `admin-nav-${item.id}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                          isActive
                            ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                            : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]/60 hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </span>
                        {item.id === 'payments' && pendingPayments.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums bg-amber-400 text-[#131314] shrink-0">
                            {pendingPayments.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile / Tablet WordPress-Style Navigation Header + Section Drawer */}
        <div className="lg:hidden w-full space-y-2.5">
          <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] truncate">
                  {activeNavItem.groupLabel}
                </div>
                <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                  {activeNavItem.label}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="admin-mobile-menu-btn"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
              <span>{mobileMenuOpen ? 'Close' : 'All Sections'}</span>
            </button>
          </div>

          {/* Mobile Grouped Menu Drawer */}
          {mobileMenuOpen && (
            <nav
              aria-label="Mobile Admin Console Sections"
              data-testid="admin-mobile-menu-drawer"
              className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-3.5 space-y-3.5 animate-in fade-in"
            >
              {ADMIN_NAV_GROUPS.map(group => (
                <div key={group.id} className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] px-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map(item => {
                      const Icon = SECTION_ICONS[item.id];
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSection(item.id)}
                          data-testid={`admin-mobile-nav-${item.id}`}
                          className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-1.5 cursor-pointer text-left border transition-colors ${
                            isActive
                              ? 'bg-[#e9eef6] dark:bg-[#282a2c] border-black/[0.12] dark:border-white/[0.15] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                              : 'bg-[#f0f4f9]/70 dark:bg-[#131314] border-transparent text-[#444746] dark:text-[#c4c7c5]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.shortLabel}</span>
                          </span>
                          {item.id === 'payments' && pendingPayments.length > 0 && (
                            <span className="px-1.5 rounded-full text-[10px] font-mono font-bold tabular-nums bg-amber-400 text-[#131314] shrink-0">
                              {pendingPayments.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          )}

          {/* Quick-Switch Strip for High-Frequency Mobile Admin Views */}
          {!mobileMenuOpen && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickMobileTabs.map(id => {
                const item = getAdminNavItem(id);
                const Icon = SECTION_ICONS[id];
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectSection(id)}
                    className={`h-8 px-3 rounded-full text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                      isActive
                        ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] border-transparent font-semibold'
                        : 'bg-white dark:bg-[#1e1f20] border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#c4c7c5]'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span>{item.shortLabel}</span>
                    {id === 'payments' && pendingPayments.length > 0 && (
                      <span className="px-1.5 rounded-full text-[9px] font-mono font-bold tabular-nums bg-amber-400 text-[#131314]">
                        {pendingPayments.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Top Breadcrumb & Primary Action Header Bar */}
          <div className="bg-white dark:bg-[#1e1f20] px-4 sm:px-6 py-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                <span>Console</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span>{activeNavItem.groupLabel}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold">
                  {activeNavItem.label}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5">
                {activeNavItem.label}
              </h1>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
                {activeNavItem.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchStats();
                fetchUsers();
                fetchPayments();
                fetchProvidersAndModels();
              }}
              className="self-start sm:self-auto h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats || loadingUsers || loadingPayments ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-3.5 text-xs rounded-2xl border flex items-start sm:items-center justify-between gap-2 ${
                isErrorFeedback
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                  : 'bg-white dark:bg-[#1e1f20] border-black/[0.08] dark:border-white/[0.08]'
              }`}
            >
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                {isErrorFeedback ? (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                )}
                <span className="text-[#1f1f1f] dark:text-[#e3e3e3] font-medium break-words">
                  {feedback}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss notice"
                className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer shrink-0 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">
                    Total Registered
                  </span>
                  <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1 tabular-nums">
                    {stats ? stats.totalUsers.toLocaleString() : '...'} users
                  </p>
                  <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Active accounts</span>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">
                    Paid Subscribers
                  </span>
                  <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1 tabular-nums">
                    {stats ? stats.activeSubscribers.toLocaleString() : '...'} active
                  </p>
                  <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Workspace access</span>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">
                    Cumulative Revenue
                  </span>
                  <p className="text-2xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1 font-mono tabular-nums">
                    {stats ? formatBDT(stats.totalRevenue) : '...'}
                  </p>
                  <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">bKash, Nagad &amp; Rocket</span>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block font-mono uppercase tracking-wider">
                    Pending Verification
                  </span>
                  <p className="text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">
                    {pendingPayments.length} orders
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('payments')}
                    className="text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                  >
                    <span>Review Payments</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* System Operations Quick Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Checkout MFS Gateways
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('mfs')}
                      className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Configure</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'bkash_enabled', label: 'bKash' },
                        { key: 'nagad_enabled', label: 'Nagad' },
                        { key: 'rocket_enabled', label: 'Rocket' }
                      ] as const
                    ).map(gw => {
                      const active = globalSettings[gw.key] !== false;
                      return (
                        <span
                          key={gw.key}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                          }`}
                        >
                          {gw.label}: {active ? 'ON' : 'OFF'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                      AI Gateway &amp; Active Models
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('models')}
                      className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Models</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
                    <span
                      className={`px-2.5 py-1 rounded-full border font-semibold ${
                        openrouterProvider?.has_api_key && openrouterProvider?.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      OpenRouter: {openrouterProvider?.has_api_key ? (openrouterProvider.is_active ? 'Live' : 'Paused') : 'Not Set'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Paid: {paidOnCount}/{paidModelsList.length} ON
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Free: {freeOnCount}/{freeModelsList.length} ON
                    </span>
                  </div>
                </div>
              </div>

              <OpenRouterUsageCard token={token} refreshSignal={openRouterRefreshSignal} />

              <div className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
                <h3 className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] text-sm mb-4">
                  Model Token Consumption Breakdown
                </h3>
                {stats && Object.keys(stats.modelUsageMap).length > 0 ? (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {Object.entries(stats.modelUsageMap).map(([modelId, tokens]) => {
                      const m = models.find(mod => mod.id === modelId);
                      return (
                        <div key={modelId} className="flex flex-wrap items-center justify-between gap-2 text-xs py-2.5 font-mono tabular-nums">
                          <span className="font-sans font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                            {m?.display_name || modelId}
                          </span>
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

          {/* Section: Payments Verification */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      placeholder="Search by TrxID, phone, or name..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>

                  {/* Status Filters */}
                  <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-1 rounded-xl sm:rounded-full text-xs w-fit max-w-full">
                    {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPaymentFilter(f)}
                        className={`px-2.5 sm:px-3 py-1 rounded-full capitalize text-xs font-semibold cursor-pointer transition-colors tabular-nums ${
                          paymentFilter === f
                            ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                            : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                        }`}
                      >
                        {f}
                        {f === 'pending' && pendingPayments.length > 0 && ` (${pendingPayments.length})`}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-xs text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums">
                  Total Records: {filteredPayments.length}
                </span>
              </div>

              <div className="bg-white dark:bg-[#1e1f20] px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="min-w-0 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Checkout Gateways:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('mfs')}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Edit Merchant Numbers &rarr;
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: 'bkash_enabled', label: 'bKash' },
                      { key: 'nagad_enabled', label: 'Nagad' },
                      { key: 'rocket_enabled', label: 'Rocket' }
                    ] as const
                  ).map(item => {
                    const active = globalSettings[item.key] !== false;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        data-testid={`payments-toggle-${item.label.toLowerCase()}`}
                        onClick={() => handleToggleMfsGateway(item.key, item.label)}
                        className={`h-7 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{item.label}: {active ? 'ON' : 'OFF'}</span>
                      </button>
                    );
                  })}
                </div>
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
                              <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono mt-0.5 tabular-nums">
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
                              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] block">Gateway &amp; Plan</span>
                              <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase">{p.gateway}</span>
                              <span className="text-[11px] font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6] block">{formatBDT(p.amount)}</span>
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
                                disabled={approvingPaymentId === p.id}
                                onClick={() => handleApprovePayment(p)}
                                className="flex-1 min-h-9 py-1.5 px-3 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
                                <span>{approvingPaymentId === p.id ? 'Approving...' : 'Approve & Activate'}</span>
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
                            <th className="py-3 px-4 font-medium">Plan &amp; Amount</th>
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
                                <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums">
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

                              <td className="py-3.5 px-4 font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
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

                              <td className="py-3.5 px-4 tabular-nums">
                                <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] font-mono">{formatBDT(p.amount)}</div>
                                <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                                  {p.plan_id === 'developer_api'
                                    ? 'Developer API Add-on'
                                    : `${p.plan_id === 'yearly' ? 'Yearly' : 'Monthly'} Plan`}
                                </span>
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
                                      disabled={approvingPaymentId === p.id}
                                      onClick={() => handleApprovePayment(p)}
                                      className="h-8 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Approve payment, activate subscription and fire Meta CAPI Purchase event"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                                      <span>{approvingPaymentId === p.id ? 'Approving...' : 'Approve & Activate'}</span>
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

          {/* Section: MFS Gateways & Receiving Numbers */}
          {activeTab === 'mfs' && (
            <MfsGatewaysTab
              globalSettings={globalSettings}
              setGlobalSettings={setGlobalSettings}
              savingSettings={savingSettings}
              onToggleMfsGateway={handleToggleMfsGateway}
              onSaveMfsNumbers={handleSaveMfsNumbers}
            />
          )}

          {/* Section: Money Management */}
          {activeTab === 'finance' && <MoneyManagementTab />}

          {/* Section: AI Models Catalog (Paid + Free Bulk ON/OFF) */}
          {activeTab === 'models' && (
            <ModelsCatalogTab
              token={token}
              models={models}
              setModels={setModels}
              onRefreshModels={fetchProvidersAndModels}
              setFeedback={setFeedback}
              modelUsageMap={stats?.modelUsageMap}
            />
          )}

          {/* Section: Providers & API Keys */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#1e1f20] p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-xs text-[#444746] dark:text-[#9aa0a6] flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#1f1f1f] dark:text-[#e3e3e3]" />
                <span>
                  <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Server-Side Secret Isolation:</strong> Configured API keys are stored strictly in PostgreSQL on the backend and never sent back to browser clients. Paste one <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">OpenRouter API Key</strong> below to power all Workspace models automatically.
                </span>
              </div>

              <OpenRouterUsageCard token={token} refreshSignal={openRouterRefreshSignal} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...providers]
                  .sort((a, b) => (a.slug === 'openrouter' ? -1 : b.slug === 'openrouter' ? 1 : 0))
                  .map(p => {
                    const isOpenRouter = p.slug === 'openrouter';
                    return (
                      <div
                        key={p.id}
                        className={`bg-white dark:bg-[#1e1f20] p-5 rounded-2xl space-y-3 min-w-0 ${
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

                        <div className="space-y-1.5 text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
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

          {/* Section: Developer API Keys */}
          {activeTab === 'developer_api' && (
            <DeveloperApiAdminTab token={token} setFeedback={setFeedback} />
          )}

          {/* Section: Users & Quotas */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Global Default Monthly Token Limit Card (Moved to Users & Quotas) */}
              <form
                onSubmit={handleSaveQuotaSetting}
                className="bg-white dark:bg-[#1e1f20] px-4 sm:px-5 py-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <label
                    htmlFor="default-monthly-quota-input"
                    className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] block"
                  >
                    Default Monthly Token Limit (New Accounts)
                  </label>
                  <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                    Applied automatically when new users sign up.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    id="default-monthly-quota-input"
                    type="number"
                    value={globalSettings.global_usage_limit || 1000000}
                    onChange={e =>
                      setGlobalSettings({
                        ...globalSettings,
                        global_usage_limit: parseInt(e.target.value, 10) || 0
                      })
                    }
                    className="w-32 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs tabular-nums focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                  />
                  <button
                    type="submit"
                    disabled={savingSettings}
                    data-testid="save-quota-btn"
                    className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Quota</span>
                  </button>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                  />
                </div>
                <span className="text-xs text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums self-end sm:self-auto">
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
                            type="button"
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
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">Tokens / Limit</span>
                          <div className="flex items-center gap-1.5">
                            <span>{(u.current_usage || 0).toLocaleString()}</span>
                            <span className="text-[#444746] dark:text-[#9aa0a6]">/</span>
                            <input
                              type="number"
                              defaultValue={u.usage_limit}
                              onBlur={e => handleUpdateUserLimit(u.id, e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[11px] font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForSub(u)}
                          className="h-8 px-3.5 rounded-full text-xs border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-medium cursor-pointer transition-colors"
                        >
                          Grant Plan
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
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
                                <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums">
                                  Exp: {new Date(u.subscription.expires_at).toLocaleDateString('en-US')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#444746] dark:text-[#9aa0a6] italic">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                              <span>{(u.current_usage || 0).toLocaleString()}</span>
                              <span className="text-[#444746] dark:text-[#9aa0a6]">/</span>
                              <input
                                type="number"
                                defaultValue={u.usage_limit}
                                onBlur={e => handleUpdateUserLimit(u.id, e.target.value)}
                                className="w-24 px-2 py-0.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[11px] font-mono tabular-nums"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
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
                              type="button"
                              onClick={() => setSelectedUserForSub(u)}
                              className="h-7 px-3 rounded-full text-xs border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-medium cursor-pointer transition-colors"
                            >
                              Grant Plan
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                type="button"
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

              {/* Grant Subscription Modal */}
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
                          className="w-full p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono tabular-nums"
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
                          Confirm &amp; Grant
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Meta Pixel (Ads) */}
          {activeTab === 'pixel' && (
            <MetaPixelTab
              globalSettings={globalSettings}
              setGlobalSettings={setGlobalSettings}
              savingSettings={savingSettings}
              testingPixel={testingPixel}
              onTestPixel={handleTestPixel}
              onSavePixel={handleSavePixelSettings}
            />
          )}

          {/* Section: Email System */}
          {activeTab === 'email' && (
            <EmailSystemTab
              token={token}
              globalSettings={globalSettings}
              setGlobalSettings={setGlobalSettings}
              webhookUrlInput={mailWebhookInput}
              setWebhookUrlInput={setMailWebhookInput}
              webhookSecretInput={mailSecretInput}
              setWebhookSecretInput={setMailSecretInput}
              savingSettings={savingSettings}
              setFeedback={setFeedback}
              onSaveEmailSettings={handleSaveEmailSettings}
            />
          )}

          {/* Section: SEO & Support */}
          {activeTab === 'seo' && (
            <SeoAndSupportTab
              token={token}
              globalSettings={globalSettings}
              setGlobalSettings={setGlobalSettings}
              savingSettings={savingSettings}
              setFeedback={setFeedback}
              onSaveSeoAndSupport={handleSaveSeoAndSupport}
              onSaveTechnicalSeo={handleSaveTechnicalSeo}
            />
          )}
        </main>
      </div>
    </div>
  );
};
