import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Zap
} from 'lucide-react';

export interface OpenRouterUsageResponse {
  configured: boolean;
  isActive: boolean;
  apiKeyMasked: string;
  checkedAt: string;
  keyStatus: {
    ok: boolean;
    error?: string;
    label: string | null;
    isFreeTier: boolean | null;
    dailyFreeRequestLimit: number | null;
    rpmFreeLimit: number;
    usageTotalUsd: number | null;
    usageDailyUsd: number | null;
    usageWeeklyUsd: number | null;
    usageMonthlyUsd: number | null;
    creditLimitUsd: number | null;
    limitRemainingUsd: number | null;
    accountTotalCreditsUsd: number | null;
    accountTotalUsageUsd: number | null;
    accountBalanceUsd: number | null;
    rateLimit: {
      requests: number;
      interval: string;
    } | null;
  };
  usage: {
    utcDay: string;
    nextUtcResetAt: string;
    today: {
      totalRequests: number;
      freeRequests: number;
      paidRequests: number;
      totalTokens: number;
      lastMinuteRequests: number;
    };
    allTime: {
      totalRequests: number;
      totalTokens: number;
    };
    dailyHistory: Array<{
      date: string;
      totalRequests: number;
      freeRequests: number;
      paidRequests: number;
      totalTokens: number;
    }>;
    todayByModel: Array<{
      modelId: string;
      displayName: string;
      openrouterSlug: string;
      isFree: boolean;
      requests: number;
      totalTokens: number;
    }>;
  };
}

interface OpenRouterUsageCardProps {
  token: string | null;
  refreshSignal?: number;
  compact?: boolean;
}

function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (val === 0) return '$0.00';
  if (val < 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(2)}`;
}

function formatResetCountdown(nextUtcResetAt?: string): string {
  if (!nextUtcResetAt) return '00:00 UTC';
  const diffMs = new Date(nextUtcResetAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Resetting soon';
  const totalMins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${mins}m`;
}

function formatShortDay(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export const OpenRouterUsageCard: React.FC<OpenRouterUsageCardProps> = ({
  token,
  refreshSignal = 0,
  compact = false
}) => {
  const [data, setData] = useState<OpenRouterUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/openrouter-usage?days=7', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to fetch OpenRouter usage');
      }
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Unable to load OpenRouter quota & request usage.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage, refreshSignal]);

  const keyStatus = data?.keyStatus;
  const usage = data?.usage;

  const isUnlocked1000 = keyStatus?.ok && keyStatus.isFreeTier === false;
  const isFree50 = keyStatus?.ok && keyStatus.isFreeTier === true;
  const dailyFreeLimit = keyStatus?.dailyFreeRequestLimit ?? 50;
  const todayFreeRequests = usage?.today.freeRequests ?? 0;
  const todayPaidRequests = usage?.today.paidRequests ?? 0;
  const todayTotalRequests = usage?.today.totalRequests ?? 0;
  const freeQuotaPct = Math.min(100, Math.round((todayFreeRequests / Math.max(1, dailyFreeLimit)) * 100));

  const progressBarColor =
    freeQuotaPct >= 90
      ? 'bg-red-500'
      : freeQuotaPct >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const maxHistoryReqs = Math.max(
    1,
    ...(usage?.dailyHistory || []).map(d => d.totalRequests)
  );

  return (
    <div
      data-testid="openrouter-usage-monitor"
      className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-start gap-2.5 min-w-0">
          <Gauge className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                OpenRouter API Quota &amp; Request Monitor
              </h3>
              {isUnlocked1000 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  1,000 req/day Active
                </span>
              )}
              {isFree50 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  <AlertCircle className="w-3 h-3" />
                  50 req/day Free Tier
                </span>
              )}
              {data && !data.configured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]">
                  Key Not Set
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
              Live status from OpenRouter <code className="font-mono text-[10px]">/api/v1/key</code> + internal UTC request tracking
              {keyStatus?.label ? ` · Key: ${keyStatus.label}` : data?.apiKeyMasked ? ` · Key: ${data.apiKeyMasked}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsage}
          disabled={loading}
          className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Checking...' : 'Refresh Live'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && data.configured && keyStatus && !keyStatus.ok && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            OpenRouter live key check warning: {keyStatus.error || 'Could not reach OpenRouter /api/v1/key.'} Internal request counts below are still up to date.
          </span>
        </div>
      )}

      {/* Tier confirmation banner */}
      {isUnlocked1000 && (
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/70 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Verified by OpenRouter:</strong>{' '}
              <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/50">
                is_free_tier: false
              </code>{' '}
              — Your API key has <strong>1,000 free requests/day</strong> (20 RPM) unlocked on <code className="font-mono text-[11px]">:free</code> models.
            </span>
          </div>
          {usage?.nextUtcResetAt && (
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              UTC reset in {formatResetCountdown(usage.nextUtcResetAt)}
            </span>
          )}
        </div>
      )}

      {isFree50 && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>OpenRouter reports</strong>{' '}
              <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/50">
                is_free_tier: true
              </code>{' '}
              (50 free req/day). If you just bought $10 credits, wait 1–2 minutes or confirm you saved the API key from the same OpenRouter account and click <strong>Refresh Live</strong>.
            </span>
          </div>
        </div>
      )}

      {/* 4 KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Free Model Daily Quota */}
        <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
              Today&apos;s :free Quota (UTC)
            </span>
            <Zap className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
          </div>
          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              {data ? todayFreeRequests.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-[#444746] dark:text-[#9aa0a6]">
              / {dailyFreeLimit.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
              style={{ width: `${Math.max(todayFreeRequests > 0 ? 3 : 0, freeQuotaPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums">
            <span>{freeQuotaPct}% used</span>
            <span>{Math.max(0, dailyFreeLimit - todayFreeRequests).toLocaleString()} left</span>
          </div>
        </div>

        {/* Total Requests Today & Live RPM */}
        <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
              Total Requests Today
            </span>
            <Activity className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
          </div>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
            {data ? todayTotalRequests.toLocaleString() : '—'}
          </p>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums space-y-0.5">
            <div>
              Free: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{todayFreeRequests}</strong> · Paid:{' '}
              <strong className={todayPaidRequests > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#1f1f1f] dark:text-[#e3e3e3]'}>
                {todayPaidRequests}
              </strong>
            </div>
            <div>
              Last 60s: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{usage?.today.lastMinuteRequests ?? 0}</strong> / {keyStatus?.rpmFreeLimit ?? 20} RPM
            </div>
          </div>
        </div>

        {/* OpenRouter Key Spend / Balance */}
        <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
              OpenRouter Credit Spend
            </span>
            <DollarSign className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
          </div>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
            {keyStatus?.ok ? formatUsd(keyStatus.usageTotalUsd) : '—'}
          </p>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums space-y-0.5">
            {keyStatus?.accountBalanceUsd !== null && keyStatus?.accountBalanceUsd !== undefined ? (
              <div>
                Account Bal: <strong className="text-emerald-600 dark:text-emerald-400">{formatUsd(keyStatus.accountBalanceUsd)}</strong>
              </div>
            ) : keyStatus?.limitRemainingUsd !== null && keyStatus?.limitRemainingUsd !== undefined ? (
              <div>
                Key Limit Left: <strong className="text-emerald-600 dark:text-emerald-400">{formatUsd(keyStatus.limitRemainingUsd)}</strong>
              </div>
            ) : (
              <div>Key Cap: Unlimited</div>
            )}
            <div>
              Today Spend: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{formatUsd(keyStatus?.usageDailyUsd)}</strong>
            </div>
          </div>
        </div>

        {/* Tokens & All-Time Requests */}
        <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
              Tokens &amp; All-Time Reqs
            </span>
            <Clock className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
          </div>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
            {usage ? usage.today.totalTokens.toLocaleString() : '—'}
          </p>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums space-y-0.5">
            <div>Today&apos;s tokens ({usage?.utcDay || 'UTC'})</div>
            <div>
              All-time: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{usage ? usage.allTime.totalRequests.toLocaleString() : '—'}</strong> reqs
            </div>
          </div>
        </div>
      </div>

      {/* Paid-model balance reminder if paid models were used today */}
      {todayPaidRequests > 0 && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200">
          <strong>Heads up:</strong> {todayPaidRequests} request{todayPaidRequests > 1 ? 's' : ''} today used non-free (paid) models, which deducts from your OpenRouter credit balance. Keep only <code className="font-mono">:free</code> models enabled if you want your $10 credit untouched.
        </div>
      )}

      {/* 7-Day Request History + Today's Model Breakdown */}
      {!compact && usage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {/* 7-Day Daily Requests */}
          <div className="p-4 rounded-xl bg-[#f0f4f9]/50 dark:bg-[#131314]/80 border border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Last 7 Days Request Volume (UTC)
              </h4>
              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                Free vs Paid
              </span>
            </div>

            <div className="space-y-2">
              {usage.dailyHistory.map(day => {
                const isToday = day.date === usage.utcDay;
                const widthPct = Math.round((day.totalRequests / maxHistoryReqs) * 100);
                const freePct =
                  day.totalRequests > 0
                    ? Math.round((day.freeRequests / day.totalRequests) * 100)
                    : 0;

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className={isToday ? 'font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]' : 'text-[#444746] dark:text-[#9aa0a6]'}>
                        {formatShortDay(day.date)} {isToday ? '(Today)' : ''}
                      </span>
                      <span className="text-[#444746] dark:text-[#9aa0a6]">
                        <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{day.totalRequests}</strong> reqs
                        <span className="ml-1.5 text-[10px]">
                          ({day.freeRequests}F / {day.paidRequests}P)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full flex rounded-full overflow-hidden transition-all duration-300"
                        style={{ width: `${day.totalRequests > 0 ? Math.max(4, widthPct) : 0}%` }}
                      >
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${freePct}%` }}
                          title={`Free requests: ${day.freeRequests}`}
                        />
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${100 - freePct}%` }}
                          title={`Paid requests: ${day.paidRequests}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Model Breakdown */}
          <div className="p-4 rounded-xl bg-[#f0f4f9]/50 dark:bg-[#131314]/80 border border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Today&apos;s Requests by Model ({usage.utcDay})
              </h4>
              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                {usage.todayByModel.length} active
              </span>
            </div>

            {usage.todayByModel.length > 0 ? (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] max-h-56 overflow-y-auto pr-1">
                {usage.todayByModel.map(item => (
                  <div
                    key={item.modelId}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                          {item.displayName}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                            item.isFree
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {item.isFree ? 'FREE' : 'PAID'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] truncate">
                        {item.openrouterSlug}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {item.requests} req{item.requests === 1 ? '' : 's'}
                      </div>
                      <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                        {item.totalTokens.toLocaleString()} tok
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] py-6 text-center">
                No AI chat requests recorded yet today (UTC). Send a message in Workspace and click Refresh Live to see live counts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
