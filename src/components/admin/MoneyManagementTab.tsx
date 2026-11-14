import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  Minus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { formatBDT } from '../../utils/billing.ts';
import {
  FinanceEntryCategory,
  FinanceLedgerEntry,
  computeAdSpendComparison,
  computeMonthlyOverview,
  computeWeeklyOverview,
  createFinanceEntry,
  exportFinanceLedgerCSV,
  exportFinanceLedgerJSON,
  filterLedgerEntries,
  formatDisplayDate,
  formatLocalDateISO,
  formatMonthLabel,
  formatShortDateRange,
  getActiveEntries,
  getDefaultTitleForCategory,
  getMonthKey,
  getTrashedEntries,
  getAvailableMonths,
  getYesterdayISO,
  loadFinanceLedger,
  parseImportedFinanceLedgerJSON,
  saveFinanceLedger,
  updateFinanceEntry,
} from '../../utils/financeLedger.ts';

type IncomePreset = 'monthly_plan' | 'yearly_plan' | 'custom_income';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const MoneyManagementTab: React.FC = () => {
  const todayISO = useMemo(() => formatLocalDateISO(new Date()), []);
  const yesterdayISO = useMemo(() => getYesterdayISO(todayISO), [todayISO]);
  const currentMonthKey = useMemo(() => getMonthKey(todayISO), [todayISO]);

  // Isolated standalone ledger state backed strictly by localStorage
  const [entries, setEntries] = useState<FinanceLedgerEntry[]>(() => loadFinanceLedger());
  const [statusMessage, setStatusMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Month overview selector
  const [selectedOverviewMonth, setSelectedOverviewMonth] = useState<string>(currentMonthKey);

  // Add Ad Cost form state
  const [adAmount, setAdAmount] = useState<string>('');
  const [adDate, setAdDate] = useState<string>(todayISO);
  const [adPlatformNote, setAdPlatformNote] = useState<string>('Meta Ads');
  const [adFormError, setAdFormError] = useState<string | null>(null);

  // Add Sale / Income form state
  const [salePreset, setSalePreset] = useState<IncomePreset>('monthly_plan');
  const [saleAmount, setSaleAmount] = useState<string>('699');
  const [saleDate, setSaleDate] = useState<string>(todayISO);
  const [saleNote, setSaleNote] = useState<string>('');
  const [saleFormError, setSaleFormError] = useState<string | null>(null);

  // Ledger filters & view mode
  const [ledgerView, setLedgerView] = useState<'active' | 'trash'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'ad_spend'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit & Change Date modal state
  const [editingEntry, setEditingEntry] = useState<FinanceLedgerEntry | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<FinanceEntryCategory>('monthly_plan');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>(todayISO);
  const [editError, setEditError] = useState<string | null>(null);

  // Fresh Start / Empty Trash confirmation modals
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [confirmEmptyTrashOpen, setConfirmEmptyTrashOpen] = useState<boolean>(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saleAmountInputRef = useRef<HTMLInputElement | null>(null);

  // Persist every ledger change cleanly to isolated localStorage key
  useEffect(() => {
    saveFinanceLedger(entries);
  }, [entries]);

  const activeEntries = useMemo(() => getActiveEntries(entries), [entries]);
  const trashedEntries = useMemo(() => getTrashedEntries(entries), [entries]);

  const availableMonths = useMemo(
    () => getAvailableMonths(entries, todayISO),
    [entries, todayISO]
  );

  useEffect(() => {
    if (!availableMonths.includes(selectedOverviewMonth)) {
      setSelectedOverviewMonth(currentMonthKey);
    }
  }, [availableMonths, selectedOverviewMonth, currentMonthKey]);

  const adSpendComparison = useMemo(
    () => computeAdSpendComparison(entries, todayISO),
    [entries, todayISO]
  );

  const weeklyOverview = useMemo(
    () => computeWeeklyOverview(entries, todayISO),
    [entries, todayISO]
  );

  const monthlyOverview = useMemo(
    () => computeMonthlyOverview(entries, selectedOverviewMonth),
    [entries, selectedOverviewMonth]
  );

  const filteredEntries = useMemo(
    () =>
      filterLedgerEntries(entries, {
        view: ledgerView,
        typeFilter,
        monthFilter,
        dateFilter,
        searchQuery,
      }),
    [entries, ledgerView, typeFilter, monthFilter, dateFilter, searchQuery]
  );

  const showToast = (kind: 'success' | 'error', text: string) => {
    setStatusMessage({ kind, text });
  };

  // --- Handlers: Add Ad Cost ---
  const handleAddAdCost = (e: React.FormEvent) => {
    e.preventDefault();
    setAdFormError(null);
    const parsed = Number(adAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setAdFormError('Please enter an ad spend amount greater than ৳0.');
      return;
    }
    try {
      const platformText = adPlatformNote.trim() || 'Meta Ads';
      const created = createFinanceEntry({
        type: 'ad_spend',
        category: 'meta_ads',
        title: platformText,
        note: '',
        amountBDT: parsed,
        date: adDate,
      });
      setEntries((prev) => [created, ...prev]);
      setAdAmount('');
      setAdPlatformNote('Meta Ads');
      showToast('success', `Added ${formatBDT(created.amountBDT)} ad spend for ${formatDisplayDate(created.date)}.`);
    } catch (err: any) {
      setAdFormError(err?.message || 'Unable to add ad cost entry.');
    }
  };

  // --- Handlers: Add Sale / Income ---
  const handleSelectSalePreset = (preset: IncomePreset) => {
    setSalePreset(preset);
    setSaleFormError(null);
    if (preset === 'monthly_plan') {
      setSaleAmount('699');
    } else if (preset === 'yearly_plan') {
      setSaleAmount('5999');
    } else {
      setSaleAmount('');
      setTimeout(() => saleAmountInputRef.current?.focus(), 0);
    }
  };

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    setSaleFormError(null);
    const parsed = Number(saleAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSaleFormError('Please enter a sale amount greater than ৳0.');
      return;
    }
    try {
      const created = createFinanceEntry({
        type: 'income',
        category: salePreset,
        title: getDefaultTitleForCategory(salePreset),
        note: saleNote.trim(),
        amountBDT: parsed,
        date: saleDate,
      });
      setEntries((prev) => [created, ...prev]);
      setSaleNote('');
      if (salePreset === 'custom_income') {
        setSaleAmount('');
      }
      showToast('success', `Added ${formatBDT(created.amountBDT)} sale entry for ${formatDisplayDate(created.date)}.`);
    } catch (err: any) {
      setSaleFormError(err?.message || 'Unable to add sale entry.');
    }
  };

  // --- Handlers: Edit & Change Date Modal ---
  const openEditModal = (entry: FinanceLedgerEntry) => {
    setEditingEntry(entry);
    setEditAmount(String(entry.amountBDT));
    setEditCategory(entry.category);
    setEditTitle(entry.title);
    setEditNote(entry.note);
    setEditDate(entry.date);
    setEditError(null);
  };

  const handleEditCategoryChange = (nextCategory: FinanceEntryCategory) => {
    setEditCategory(nextCategory);
    if (nextCategory === 'monthly_plan') {
      setEditTitle('Monthly Plan (৳699)');
      setEditAmount('699');
    } else if (nextCategory === 'yearly_plan') {
      setEditTitle('Yearly Plan (৳5,999)');
      setEditAmount('5999');
    } else if (nextCategory === 'custom_income') {
      setEditTitle('Custom Sale');
    } else {
      setEditTitle('Meta Ads');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setEditError(null);
    const parsed = Number(editAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEditError('Amount must be greater than ৳0.');
      return;
    }
    try {
      const updated = updateFinanceEntry(editingEntry, {
        amountBDT: parsed,
        category: editCategory,
        title: editTitle,
        note: editNote,
        date: editDate,
      });
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingEntry(null);
      showToast('success', `Updated entry for ${formatDisplayDate(updated.date)}.`);
    } catch (err: any) {
      setEditError(err?.message || 'Could not update entry.');
    }
  };

  // --- Handlers: Trash / Restore / Delete Forever / Fresh Start ---
  const handleMoveToTrash = (entry: FinanceLedgerEntry) => {
    const nowIso = new Date().toISOString();
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, deletedAt: nowIso, updatedAt: nowIso } : item))
    );
    showToast('success', `Moved "${entry.title}" (${formatBDT(entry.amountBDT)}) to Trash.`);
  };

  const handleRestoreEntry = (entry: FinanceLedgerEntry) => {
    const nowIso = new Date().toISOString();
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, deletedAt: null, updatedAt: nowIso } : item))
    );
    showToast('success', `Restored "${entry.title}" (${formatBDT(entry.amountBDT)}) to Active Ledger.`);
  };

  const handlePermanentDelete = (entry: FinanceLedgerEntry) => {
    setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    showToast('success', `Permanently deleted "${entry.title}".`);
  };

  const handleConfirmEmptyTrash = () => {
    setEntries((prev) => prev.filter((item) => item.deletedAt === null));
    setConfirmEmptyTrashOpen(false);
    showToast('success', 'Trash emptied.');
  };

  const handleConfirmFreshStart = () => {
    setEntries([]);
    setConfirmResetOpen(false);
    setLedgerView('active');
    setTypeFilter('all');
    setMonthFilter('all');
    setDateFilter('');
    setSearchQuery('');
    showToast('success', 'All manual income and ad cost records have been cleared for a fresh start.');
  };

  // --- Handlers: CSV Export & JSON Backup Export / Import ---
  const handleExportCSV = () => {
    const exportSource =
      ledgerView === 'active'
        ? filteredEntries
        : filterLedgerEntries(entries, {
            view: 'active',
            typeFilter,
            monthFilter: selectedOverviewMonth,
            dateFilter: '',
            searchQuery: '',
          });

    const targetRows = exportSource.length > 0 ? exportSource : activeEntries;
    const csv = exportFinanceLedgerCSV(targetRows);
    const suffix = monthFilter !== 'all' ? monthFilter : selectedOverviewMonth;
    downloadTextFile(`bangla-ai-finance-${suffix}.csv`, csv, 'text/csv;charset=utf-8;');
    showToast('success', `Exported ${targetRows.length} ledger ${targetRows.length === 1 ? 'entry' : 'entries'} to CSV.`);
  };

  const handleExportJSON = () => {
    const json = exportFinanceLedgerJSON(entries);
    downloadTextFile(`bangla-ai-finance-backup-${todayISO}.json`, json, 'application/json;charset=utf-8;');
    showToast('success', `Downloaded JSON backup (${entries.length} total records).`);
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rawText = await file.text();
      const imported = parseImportedFinanceLedgerJSON(rawText);
      setEntries((prev) => {
        const existingMap = new Map(prev.map((item) => [item.id, item]));
        for (const item of imported) {
          existingMap.set(item.id, item);
        }
        return Array.from(existingMap.values());
      });
      showToast('success', `Imported ${imported.length} finance ${imported.length === 1 ? 'entry' : 'entries'} from JSON backup.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to import JSON backup.');
    }
  };

  const clearLedgerFilters = () => {
    setTypeFilter('all');
    setMonthFilter('all');
    setDateFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    typeFilter !== 'all' || monthFilter !== 'all' || dateFilter !== '' || searchQuery.trim() !== '';

  return (
    <div data-testid="money-management-tab" className="space-y-6">
      {/* Top Toolbar: Section Title + Backup/Export + Fresh Start Reset */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              Money Management
            </h2>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
              Standalone manual finance &amp; Meta ad spend tracker · Saved locally in this browser
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJSONFile}
            className="hidden"
            aria-label="Import finance ledger JSON backup"
          />

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="h-9 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="h-9 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            data-testid="finance-export-csv-btn"
            className="h-9 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            data-testid="finance-fresh-start-btn"
            className="h-9 px-3.5 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/80 dark:hover:bg-red-950/50 text-xs font-semibold text-red-700 dark:text-red-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Reset / Clear All Entries (Fresh Start)</span>
          </button>
        </div>
      </div>

      {/* Inline Action Feedback Banner */}
      {statusMessage && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            statusMessage.kind === 'error'
              ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
              : 'bg-[#f0f4f9] dark:bg-[#1e1f20] border-black/[0.08] dark:border-white/[0.08] text-[#1f1f1f] dark:text-[#e3e3e3]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {statusMessage.kind === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}
            <span className="font-medium break-words">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss message"
            className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Financial Overview & Analytics Cards (Top Dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Card 1: Meta Ads Spend Comparison (Today vs Yesterday) */}
        <section
          aria-label="Meta Ads Spend Comparison"
          className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#444746] dark:text-[#9aa0a6]">
                Meta Ads Spend Comparison
              </h3>
              <span className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                Today vs Yesterday
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                  Today&apos;s Ad Spend
                </span>
                <p
                  data-testid="today-ad-spend-value"
                  className="text-2xl font-bold font-mono tabular-nums tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-1"
                >
                  {formatBDT(adSpendComparison.todaySpendBDT)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                  Yesterday&apos;s Ad Spend
                </span>
                <p
                  data-testid="yesterday-ad-spend-value"
                  className="text-2xl font-bold font-mono tabular-nums tracking-tight text-[#444746] dark:text-[#9aa0a6] mt-1"
                >
                  {formatBDT(adSpendComparison.yesterdaySpendBDT)}
                </p>
              </div>
            </div>
          </div>

          <div
            data-testid="ad-spend-comparison-indicator"
            className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-1.5 text-xs"
          >
            {adSpendComparison.trend === 'higher' && (
              <>
                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                <span className="font-medium text-red-700 dark:text-red-400 font-mono tabular-nums">
                  +{formatBDT(adSpendComparison.deltaBDT)} ({adSpendComparison.deltaPercent}%) higher than yesterday
                </span>
              </>
            )}
            {adSpendComparison.trend === 'lower' && (
              <>
                <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-medium text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                  {formatBDT(Math.abs(adSpendComparison.deltaBDT))} ({Math.abs(adSpendComparison.deltaPercent ?? 0)}%) lower than yesterday
                </span>
              </>
            )}
            {adSpendComparison.trend === 'equal' && (
              <>
                <Minus className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0" aria-hidden="true" />
                <span className="text-[#444746] dark:text-[#9aa0a6]">
                  {adSpendComparison.todaySpendBDT === 0
                    ? 'No ad spend logged for today or yesterday'
                    : 'Equal to yesterday’s ad spend'}
                </span>
              </>
            )}
            {adSpendComparison.trend === 'no_yesterday' && (
              <>
                <ArrowUpRight className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0" aria-hidden="true" />
                <span className="text-[#444746] dark:text-[#9aa0a6]">
                  {formatBDT(adSpendComparison.todaySpendBDT)} logged today · ৳0 yesterday
                </span>
              </>
            )}
          </div>
        </section>

        {/* Card 2: This Week's Overview (Current 7-Day Week) */}
        <section
          aria-label="This Week's Overview"
          className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#444746] dark:text-[#9aa0a6]">
                This Week&apos;s Overview
              </h3>
              <span className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6] tabular-nums">
                {formatShortDateRange(weeklyOverview.startDate, weeklyOverview.endDate)}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                Weekly Net {weeklyOverview.netProfitBDT >= 0 ? 'Profit' : 'Loss'}
              </span>
              <p
                data-testid="weekly-net-profit-value"
                className={`text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${
                  weeklyOverview.netProfitBDT >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {weeklyOverview.netProfitBDT >= 0
                  ? `+${formatBDT(weeklyOverview.netProfitBDT)}`
                  : `-${formatBDT(Math.abs(weeklyOverview.netProfitBDT))}`}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">Weekly Income</span>
              <span
                data-testid="weekly-income-value"
                className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
              >
                +{formatBDT(weeklyOverview.incomeBDT)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">Weekly Ad Spend</span>
              <span
                data-testid="weekly-ad-spend-value"
                className="font-mono font-semibold tabular-nums text-red-700 dark:text-red-400"
              >
                -{formatBDT(weeklyOverview.adSpendBDT)}
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Monthly Overview (with Month Selector Dropdown) */}
        <section
          aria-label="Monthly Overview"
          className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#444746] dark:text-[#9aa0a6]">
                Monthly Overview
              </h3>
              <select
                aria-label="Select month for monthly financial overview"
                data-testid="monthly-overview-select"
                value={selectedOverviewMonth}
                onChange={(e) => setSelectedOverviewMonth(e.target.value)}
                className="h-7 px-2.5 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] cursor-pointer"
              >
                {availableMonths.map((mk) => (
                  <option key={mk} value={mk}>
                    {formatMonthLabel(mk)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">Gross Income</span>
                <p
                  data-testid="monthly-gross-income-value"
                  className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5"
                >
                  {formatBDT(monthlyOverview.grossIncomeBDT)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">Meta Spend</span>
                <p
                  data-testid="monthly-ad-spend-value"
                  className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5"
                >
                  {formatBDT(monthlyOverview.adSpendBDT)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                  Net {monthlyOverview.netProfitBDT >= 0 ? 'Profit' : 'Loss'}
                </span>
                <p
                  data-testid="monthly-net-profit-value"
                  className={`text-base sm:text-lg font-bold font-mono tabular-nums mt-0.5 ${
                    monthlyOverview.netProfitBDT >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {monthlyOverview.netProfitBDT >= 0
                    ? `+${formatBDT(monthlyOverview.netProfitBDT)}`
                    : `-${formatBDT(Math.abs(monthlyOverview.netProfitBDT))}`}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#444746] dark:text-[#9aa0a6]">ROAS:</span>
              <span
                data-testid="monthly-roas-value"
                className="font-mono font-bold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                {monthlyOverview.roas !== null ? `${monthlyOverview.roas.toFixed(2).replace(/\.?0+$/, '')}x` : '—'}
              </span>
            </div>
            <div
              data-testid="monthly-plan-breakdown"
              className="text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono tabular-nums"
            >
              {monthlyOverview.monthlyPlanCount} Monthly · {monthlyOverview.yearlyPlanCount} Yearly
              {monthlyOverview.customIncomeCount > 0 ? ` · ${monthlyOverview.customIncomeCount} Custom` : ''}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Quick Manual Entry Forms (Side-by-Side Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Form Card 1: Add Ad Cost */}
        <form
          onSubmit={handleAddAdCost}
          data-testid="add-ad-cost-form"
          className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Add Ad Cost
                </h3>
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  Meta Ads / Marketing Spend
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-red-700 dark:text-red-400">
                Expense (-৳)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ad-cost-amount"
                  className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1.5"
                >
                  Amount (৳)
                </label>
                <input
                  id="ad-cost-amount"
                  data-testid="ad-cost-amount-input"
                  type="number"
                  min="1"
                  step="any"
                  value={adAmount}
                  onChange={(e) => {
                    setAdAmount(e.target.value);
                    setAdFormError(null);
                  }}
                  placeholder="e.g. 1500"
                  className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-sm font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="ad-cost-date"
                    className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                  >
                    Date
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAdDate(todayISO)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        adDate === todayISO
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      data-testid="ad-cost-yesterday-pill"
                      onClick={() => setAdDate(yesterdayISO)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        adDate === yesterdayISO
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  id="ad-cost-date"
                  data-testid="ad-cost-date-input"
                  type="date"
                  value={adDate}
                  onChange={(e) => setAdDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] dark:[color-scheme:dark] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="ad-cost-platform"
                className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1.5"
              >
                Platform / Note
              </label>
              <input
                id="ad-cost-platform"
                data-testid="ad-cost-note-input"
                type="text"
                value={adPlatformNote}
                onChange={(e) => setAdPlatformNote(e.target.value)}
                placeholder="Meta Ads (e.g. Video Campaign)"
                className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            {adFormError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                {adFormError}
              </p>
            )}
          </div>

          <button
            type="submit"
            data-testid="add-ad-cost-submit"
            className="btn-pill-secondary w-full h-10 text-xs font-semibold justify-center cursor-pointer"
          >
            + Add Ad Cost
          </button>
        </form>

        {/* Form Card 2: Add Sale / Income Entry */}
        <form
          onSubmit={handleAddSale}
          data-testid="add-sale-form"
          className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Add Sale / Income Entry
                </h3>
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  Manual plan &amp; custom revenue log
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400">
                Income (+৳)
              </span>
            </div>

            {/* Plan Quick Preset Pills */}
            <div>
              <span className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1.5">
                Select Plan
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-testid="sale-preset-monthly"
                  onClick={() => handleSelectSalePreset('monthly_plan')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    salePreset === 'monthly_plan'
                      ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] border border-black/[0.08] dark:border-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  Monthly Plan (৳699)
                </button>
                <button
                  type="button"
                  data-testid="sale-preset-yearly"
                  onClick={() => handleSelectSalePreset('yearly_plan')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    salePreset === 'yearly_plan'
                      ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] border border-black/[0.08] dark:border-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  Yearly Plan (৳5,999)
                </button>
                <button
                  type="button"
                  data-testid="sale-preset-custom"
                  onClick={() => handleSelectSalePreset('custom_income')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    salePreset === 'custom_income'
                      ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                      : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] border border-black/[0.08] dark:border-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  Custom Amount
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sale-amount"
                  className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1.5"
                >
                  Amount (৳)
                </label>
                <input
                  ref={saleAmountInputRef}
                  id="sale-amount"
                  data-testid="sale-amount-input"
                  type="number"
                  min="1"
                  step="any"
                  value={saleAmount}
                  onChange={(e) => {
                    setSaleAmount(e.target.value);
                    setSaleFormError(null);
                  }}
                  placeholder="e.g. 699"
                  className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-sm font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="sale-date"
                    className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                  >
                    Date
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSaleDate(todayISO)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        saleDate === todayISO
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      data-testid="sale-yesterday-pill"
                      onClick={() => setSaleDate(yesterdayISO)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        saleDate === yesterdayISO
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  id="sale-date"
                  data-testid="sale-date-input"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] dark:[color-scheme:dark] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sale-note"
                className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1.5"
              >
                Customer / Note (Optional)
              </label>
              <input
                id="sale-note"
                data-testid="sale-note-input"
                type="text"
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                placeholder="e.g. bKash - Rahim"
                className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            {saleFormError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                {saleFormError}
              </p>
            )}
          </div>

          <button
            type="submit"
            data-testid="add-sale-submit"
            className="btn-pill-primary w-full h-10 text-xs font-semibold justify-center cursor-pointer"
          >
            + Add Sale Entry
          </button>
        </form>
      </div>

      {/* 4. Unified Ledger History with Full Edit, Date Change, Trash & Reset Controls */}
      <section
        aria-label="Transaction and Ad Spend Ledger"
        className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden"
      >
        {/* Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-black/[0.08] dark:border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Active vs Trash Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                data-testid="ledger-view-active"
                onClick={() => setLedgerView('active')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  ledgerView === 'active'
                    ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                Active Ledger ({activeEntries.length})
              </button>
              <button
                type="button"
                data-testid="ledger-view-trash"
                onClick={() => setLedgerView('trash')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  ledgerView === 'trash'
                    ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                Trash ({trashedEntries.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Segmented Filter */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06]">
                {(
                  [
                    { id: 'all', label: 'All Entries' },
                    { id: 'income', label: 'Income Only' },
                    { id: 'ad_spend', label: 'Ad Cost Only' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`ledger-type-filter-${item.id}`}
                    onClick={() => setTypeFilter(item.id)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      typeFilter === item.id
                        ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold shadow-2xs'
                        : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {ledgerView === 'trash' && trashedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmEmptyTrashOpen(true)}
                  className="h-8 px-3 rounded-full border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Empty Trash
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] gap-2.5 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" aria-hidden="true" />
              <input
                type="text"
                data-testid="ledger-search-input"
                aria-label="Search ledger entries"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by plan, customer note, date, or amount..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <select
              aria-label="Filter ledger by month"
              data-testid="ledger-month-filter"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] cursor-pointer"
            >
              <option value="all">All Months</option>
              {availableMonths.map((mk) => (
                <option key={mk} value={mk}>
                  {formatMonthLabel(mk)}
                </option>
              ))}
            </select>

            <div className="relative flex items-center">
              <input
                type="date"
                aria-label="Filter ledger by exact date"
                data-testid="ledger-date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] dark:[color-scheme:dark] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  aria-label="Clear exact date filter"
                  className="ml-1.5 text-xs text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer shrink-0 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearLedgerFilters}
                className="h-9 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Ledger Content */}
        {filteredEntries.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <p className="text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
              {ledgerView === 'trash'
                ? 'Trash is empty'
                : hasActiveFilters
                  ? 'No entries match your current filters'
                  : 'No financial entries recorded yet'}
            </p>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-md mx-auto">
              {ledgerView === 'trash'
                ? 'Deleted entries appear here so you can restore or permanently delete them anytime.'
                : hasActiveFilters
                  ? 'Try adjusting your search, type filter, month, or date filter.'
                  : 'Use the Add Ad Cost or Add Sale / Income Entry cards above to log your first entry.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearLedgerFilters}
                className="mt-2 inline-flex items-center px-3.5 py-1.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  data-testid={`ledger-row-${entry.id}`}
                  className="p-4 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            entry.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/80 dark:border-red-800/60'
                          }`}
                        >
                          {entry.type === 'income' ? 'Sale' : 'Ad Spend'}
                        </span>
                        <span className="font-mono text-[11px] text-[#444746] dark:text-[#9aa0a6] tabular-nums">
                          {formatDisplayDate(entry.date)}
                        </span>
                      </div>
                      <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] break-words">
                        {entry.title}
                      </div>
                      {entry.note && (
                        <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] break-words">
                          {entry.note}
                        </div>
                      )}
                    </div>

                    <span
                      className={`font-mono font-bold text-sm tabular-nums shrink-0 ${
                        entry.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {entry.type === 'income' ? `+${formatBDT(entry.amountBDT)}` : `-${formatBDT(entry.amountBDT)}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {ledgerView === 'active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          aria-label={`Edit ${entry.title} on ${formatDisplayDate(entry.date)}`}
                          className="h-8 px-3 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveToTrash(entry)}
                          aria-label={`Move ${entry.title} on ${formatDisplayDate(entry.date)} to trash`}
                          className="h-8 px-3 rounded-full border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>Trash</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestoreEntry(entry)}
                          aria-label={`Restore ${entry.title} on ${formatDisplayDate(entry.date)}`}
                          className="h-8 px-3 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(entry)}
                          aria-label={`Permanently delete ${entry.title} on ${formatDisplayDate(entry.date)}`}
                          className="h-8 px-3 rounded-full border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Plan / Title</th>
                    <th className="py-3 px-4 font-medium">Note</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      data-testid={`ledger-row-${entry.id}`}
                      className="hover:bg-[#f0f4f9]/60 dark:hover:bg-[#282a2c]/60 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            entry.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/80 dark:border-red-800/60'
                          }`}
                        >
                          {entry.type === 'income' ? 'Sale' : 'Ad Spend'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {entry.title}
                      </td>

                      <td className="py-3 px-4 text-[#444746] dark:text-[#9aa0a6] max-w-[260px] truncate">
                        {entry.note || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6] whitespace-nowrap">
                        {formatDisplayDate(entry.date)}
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          entry.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {entry.type === 'income' ? `+${formatBDT(entry.amountBDT)}` : `-${formatBDT(entry.amountBDT)}`}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {ledgerView === 'active' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(entry)}
                                aria-label={`Edit ${entry.title} on ${formatDisplayDate(entry.date)}`}
                                className="h-7 px-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveToTrash(entry)}
                                aria-label={`Move ${entry.title} on ${formatDisplayDate(entry.date)} to trash`}
                                className="h-7 px-2.5 rounded-full border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-medium text-red-700 dark:text-red-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                <span>Trash</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestoreEntry(entry)}
                                aria-label={`Restore ${entry.title} on ${formatDisplayDate(entry.date)}`}
                                className="h-7 px-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                <span>Restore</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(entry)}
                                aria-label={`Permanently delete ${entry.title} on ${formatDisplayDate(entry.date)}`}
                                className="h-7 px-2.5 rounded-full border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-medium text-red-700 dark:text-red-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                <span>Delete Forever</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Edit & Change Date Modal */}
      {editingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-finance-entry-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3]" aria-hidden="true" />
                <h3
                  id="edit-finance-entry-title"
                  className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Edit Entry &amp; Change Date
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                aria-label="Close edit modal"
                className="text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {editingEntry.type === 'income' ? (
                <div>
                  <label
                    htmlFor="edit-entry-category"
                    className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
                  >
                    Plan / Category
                  </label>
                  <select
                    id="edit-entry-category"
                    value={editCategory}
                    onChange={(e) => handleEditCategoryChange(e.target.value as FinanceEntryCategory)}
                    className="w-full h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                  >
                    <option value="monthly_plan">Monthly Plan (৳699)</option>
                    <option value="yearly_plan">Yearly Plan (৳5,999)</option>
                    <option value="custom_income">Custom Amount</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="edit-entry-title"
                  className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
                >
                  {editingEntry.type === 'income' ? 'Entry Label' : 'Platform / Ad Campaign'}
                </label>
                <input
                  id="edit-entry-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-entry-amount"
                    className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
                  >
                    Amount (৳)
                  </label>
                  <input
                    id="edit-entry-amount"
                    data-testid="edit-entry-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={editAmount}
                    onChange={(e) => {
                      setEditAmount(e.target.value);
                      setEditError(null);
                    }}
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-entry-date"
                    className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="edit-entry-date"
                    data-testid="edit-entry-date-input"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] dark:[color-scheme:dark] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-entry-note"
                  className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1"
                >
                  Note
                </label>
                <input
                  id="edit-entry-note"
                  data-testid="edit-entry-note-input"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Optional reference or campaign note"
                  className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="btn-pill-secondary h-9 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="edit-entry-save-btn"
                className="btn-pill-primary h-9 px-5 text-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fresh Start Reset Confirmation Dialog */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fresh-start-dialog-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="fresh-start-dialog-title"
                  className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Reset / Clear All Entries (Fresh Start)
                </h3>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-1 leading-relaxed">
                  Are you sure you want to delete all manual income and ad cost records for a fresh start?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="btn-pill-secondary h-9 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-fresh-start-btn"
                onClick={handleConfirmFreshStart}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirm Fresh Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Dialog */}
      {confirmEmptyTrashOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="empty-trash-dialog-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-6 space-y-4 shadow-xl">
            <h3
              id="empty-trash-dialog-title"
              className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
            >
              Empty Trash Permanently?
            </h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
              This will permanently remove {trashedEntries.length} trashed{' '}
              {trashedEntries.length === 1 ? 'entry' : 'entries'} from your local ledger. Active entries are unaffected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmEmptyTrashOpen(false)}
                className="btn-pill-secondary h-9 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
