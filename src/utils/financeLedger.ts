import { formatBDT } from './billing.ts';

export const FINANCE_LEDGER_STORAGE_KEY = 'bangla_ai_admin_finance_ledger';

export type FinanceEntryType = 'income' | 'ad_spend';

export type FinanceEntryCategory =
  | 'monthly_plan'
  | 'yearly_plan'
  | 'custom_income'
  | 'meta_ads';

export interface FinanceLedgerEntry {
  id: string;
  type: FinanceEntryType;
  category: FinanceEntryCategory;
  title: string;
  note: string;
  amountBDT: number;
  /** Local calendar date in YYYY-MM-DD format */
  date: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinanceEntryInput {
  type: FinanceEntryType;
  category: FinanceEntryCategory;
  title?: string;
  note?: string;
  amountBDT: number;
  date: string;
}

export interface UpdateFinanceEntryInput {
  category?: FinanceEntryCategory;
  title?: string;
  note?: string;
  amountBDT?: number;
  date?: string;
}

export interface AdSpendComparison {
  todayDate: string;
  yesterdayDate: string;
  todaySpendBDT: number;
  yesterdaySpendBDT: number;
  deltaBDT: number;
  deltaPercent: number | null;
  trend: 'higher' | 'lower' | 'equal' | 'no_yesterday';
}

export interface WeeklyOverview {
  startDate: string;
  endDate: string;
  incomeBDT: number;
  adSpendBDT: number;
  netProfitBDT: number;
  entryCount: number;
}

export interface MonthlyOverview {
  monthKey: string;
  grossIncomeBDT: number;
  adSpendBDT: number;
  netProfitBDT: number;
  roas: number | null;
  monthlyPlanCount: number;
  yearlyPlanCount: number;
  customIncomeCount: number;
  totalSalesCount: number;
  adSpendCount: number;
}

export interface LedgerFilterOptions {
  view: 'active' | 'trash';
  typeFilter: 'all' | 'income' | 'ad_spend';
  monthFilter: string; // 'all' or 'YYYY-MM'
  dateFilter: string; // '' or 'YYYY-MM-DD'
  searchQuery: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function formatLocalDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateISO(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftISODate(isoDate: string, deltaDays: number): string {
  const dt = parseLocalDateISO(isoDate);
  dt.setDate(dt.getDate() + deltaDays);
  return formatLocalDateISO(dt);
}

export function getYesterdayISO(todayISO: string): string {
  return shiftISODate(todayISO, -1);
}

export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function formatDisplayDate(isoDate: string): string {
  if (!isValidISODate(isoDate)) return isoDate;
  const dt = parseLocalDateISO(isoDate);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDateRange(startISO: string, endISO: string): string {
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) {
    return `${startISO} – ${endISO}`;
  }
  const startDt = parseLocalDateISO(startISO);
  const endDt = parseLocalDateISO(endISO);
  const sameYear = startDt.getFullYear() === endDt.getFullYear();
  const startStr = startDt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endStr = endDt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getDefaultTitleForCategory(category: FinanceEntryCategory): string {
  switch (category) {
    case 'monthly_plan':
      return 'Monthly Plan (৳699)';
    case 'yearly_plan':
      return 'Yearly Plan (৳5,999)';
    case 'custom_income':
      return 'Custom Sale';
    case 'meta_ads':
      return 'Meta Ads';
  }
}

export function generateFinanceEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fin_${crypto.randomUUID()}`;
  }
  return `fin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createFinanceEntry(
  input: CreateFinanceEntryInput,
  nowIso: string = new Date().toISOString()
): FinanceLedgerEntry {
  const amount = Number(input.amountBDT);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than 0.');
  }
  if (!isValidISODate(input.date)) {
    throw new Error('Please choose a valid calendar date.');
  }

  const trimmedTitle = (input.title || '').trim();
  const title = trimmedTitle || getDefaultTitleForCategory(input.category);

  return {
    id: generateFinanceEntryId(),
    type: input.type,
    category: input.category,
    title,
    note: (input.note || '').trim(),
    amountBDT: Math.round(amount * 100) / 100,
    date: input.date,
    deletedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateFinanceEntry(
  entry: FinanceLedgerEntry,
  updates: UpdateFinanceEntryInput,
  nowIso: string = new Date().toISOString()
): FinanceLedgerEntry {
  const nextAmount = updates.amountBDT !== undefined ? Number(updates.amountBDT) : entry.amountBDT;
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new Error('Amount must be greater than 0.');
  }

  const nextDate = updates.date !== undefined ? updates.date : entry.date;
  if (!isValidISODate(nextDate)) {
    throw new Error('Please choose a valid calendar date.');
  }

  const nextCategory = updates.category ?? entry.category;
  const nextTitle =
    updates.title !== undefined
      ? updates.title.trim() || getDefaultTitleForCategory(nextCategory)
      : entry.title;

  return {
    ...entry,
    category: nextCategory,
    title: nextTitle,
    note: updates.note !== undefined ? updates.note.trim() : entry.note,
    amountBDT: Math.round(nextAmount * 100) / 100,
    date: nextDate,
    updatedAt: nowIso,
  };
}

export function getActiveEntries(entries: readonly FinanceLedgerEntry[]): FinanceLedgerEntry[] {
  return entries.filter((entry) => entry.deletedAt === null);
}

export function getTrashedEntries(entries: readonly FinanceLedgerEntry[]): FinanceLedgerEntry[] {
  return entries.filter((entry) => entry.deletedAt !== null);
}

export function computeAdSpendComparison(
  entries: readonly FinanceLedgerEntry[],
  todayISO: string = formatLocalDateISO()
): AdSpendComparison {
  const yesterdayISO = getYesterdayISO(todayISO);
  const activeAdSpend = getActiveEntries(entries).filter((e) => e.type === 'ad_spend');

  let todaySpendBDT = 0;
  let yesterdaySpendBDT = 0;

  for (const entry of activeAdSpend) {
    if (entry.date === todayISO) {
      todaySpendBDT += entry.amountBDT;
    } else if (entry.date === yesterdayISO) {
      yesterdaySpendBDT += entry.amountBDT;
    }
  }

  todaySpendBDT = Math.round(todaySpendBDT * 100) / 100;
  yesterdaySpendBDT = Math.round(yesterdaySpendBDT * 100) / 100;
  const deltaBDT = Math.round((todaySpendBDT - yesterdaySpendBDT) * 100) / 100;

  let trend: AdSpendComparison['trend'] = 'equal';
  let deltaPercent: number | null = null;

  if (yesterdaySpendBDT === 0) {
    trend = todaySpendBDT === 0 ? 'equal' : 'no_yesterday';
  } else {
    deltaPercent = Math.round(((todaySpendBDT - yesterdaySpendBDT) / yesterdaySpendBDT) * 1000) / 10;
    if (deltaBDT > 0) trend = 'higher';
    else if (deltaBDT < 0) trend = 'lower';
    else trend = 'equal';
  }

  return {
    todayDate: todayISO,
    yesterdayDate: yesterdayISO,
    todaySpendBDT,
    yesterdaySpendBDT,
    deltaBDT,
    deltaPercent,
    trend,
  };
}

export function computeWeeklyOverview(
  entries: readonly FinanceLedgerEntry[],
  todayISO: string = formatLocalDateISO()
): WeeklyOverview {
  const startDate = shiftISODate(todayISO, -6);
  const endDate = todayISO;

  let incomeBDT = 0;
  let adSpendBDT = 0;
  let entryCount = 0;

  for (const entry of getActiveEntries(entries)) {
    if (entry.date >= startDate && entry.date <= endDate) {
      entryCount += 1;
      if (entry.type === 'income') {
        incomeBDT += entry.amountBDT;
      } else {
        adSpendBDT += entry.amountBDT;
      }
    }
  }

  incomeBDT = Math.round(incomeBDT * 100) / 100;
  adSpendBDT = Math.round(adSpendBDT * 100) / 100;
  const netProfitBDT = Math.round((incomeBDT - adSpendBDT) * 100) / 100;

  return {
    startDate,
    endDate,
    incomeBDT,
    adSpendBDT,
    netProfitBDT,
    entryCount,
  };
}

export function computeMonthlyOverview(
  entries: readonly FinanceLedgerEntry[],
  monthKey: string = getMonthKey(formatLocalDateISO())
): MonthlyOverview {
  let grossIncomeBDT = 0;
  let adSpendBDT = 0;
  let monthlyPlanCount = 0;
  let yearlyPlanCount = 0;
  let customIncomeCount = 0;
  let totalSalesCount = 0;
  let adSpendCount = 0;

  for (const entry of getActiveEntries(entries)) {
    if (getMonthKey(entry.date) !== monthKey) continue;

    if (entry.type === 'income') {
      grossIncomeBDT += entry.amountBDT;
      totalSalesCount += 1;
      if (entry.category === 'monthly_plan') {
        monthlyPlanCount += 1;
      } else if (entry.category === 'yearly_plan') {
        yearlyPlanCount += 1;
      } else {
        customIncomeCount += 1;
      }
    } else {
      adSpendBDT += entry.amountBDT;
      adSpendCount += 1;
    }
  }

  grossIncomeBDT = Math.round(grossIncomeBDT * 100) / 100;
  adSpendBDT = Math.round(adSpendBDT * 100) / 100;
  const netProfitBDT = Math.round((grossIncomeBDT - adSpendBDT) * 100) / 100;
  const roas = adSpendBDT > 0 ? Math.round((grossIncomeBDT / adSpendBDT) * 100) / 100 : null;

  return {
    monthKey,
    grossIncomeBDT,
    adSpendBDT,
    netProfitBDT,
    roas,
    monthlyPlanCount,
    yearlyPlanCount,
    customIncomeCount,
    totalSalesCount,
    adSpendCount,
  };
}

export function getAvailableMonths(
  entries: readonly FinanceLedgerEntry[],
  todayISO: string = formatLocalDateISO()
): string[] {
  const monthSet = new Set<string>([getMonthKey(todayISO)]);
  for (const entry of getActiveEntries(entries)) {
    if (isValidISODate(entry.date)) {
      monthSet.add(getMonthKey(entry.date));
    }
  }
  return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
}

export function filterLedgerEntries(
  entries: readonly FinanceLedgerEntry[],
  options: LedgerFilterOptions
): FinanceLedgerEntry[] {
  const query = options.searchQuery.trim().toLowerCase();

  return entries
    .filter((entry) => {
      const isTrashed = entry.deletedAt !== null;
      if (options.view === 'trash' && !isTrashed) return false;
      if (options.view === 'active' && isTrashed) return false;

      if (options.typeFilter !== 'all' && entry.type !== options.typeFilter) {
        return false;
      }

      if (options.monthFilter && options.monthFilter !== 'all') {
        if (getMonthKey(entry.date) !== options.monthFilter) return false;
      }

      if (options.dateFilter && isValidISODate(options.dateFilter)) {
        if (entry.date !== options.dateFilter) return false;
      }

      if (query) {
        const haystack = [
          entry.title,
          entry.note,
          entry.date,
          String(entry.amountBDT),
          formatBDT(entry.amountBDT),
          entry.type === 'income' ? 'sale income' : 'ad spend cost',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function isValidEntryRecord(item: unknown): item is FinanceLedgerEntry {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || !candidate.id) return false;
  if (candidate.type !== 'income' && candidate.type !== 'ad_spend') return false;
  if (
    candidate.category !== 'monthly_plan' &&
    candidate.category !== 'yearly_plan' &&
    candidate.category !== 'custom_income' &&
    candidate.category !== 'meta_ads'
  ) {
    return false;
  }
  if (typeof candidate.title !== 'string') return false;
  if (typeof candidate.note !== 'string') return false;
  if (typeof candidate.amountBDT !== 'number' || !Number.isFinite(candidate.amountBDT) || candidate.amountBDT <= 0) {
    return false;
  }
  if (typeof candidate.date !== 'string' || !isValidISODate(candidate.date)) return false;
  if (candidate.deletedAt !== null && typeof candidate.deletedAt !== 'string') return false;
  if (typeof candidate.createdAt !== 'string' || typeof candidate.updatedAt !== 'string') return false;
  return true;
}

export function loadFinanceLedger(storage?: StorageLike | null): FinanceLedgerEntry[] {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(FINANCE_LEDGER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntryRecord);
  } catch {
    return [];
  }
}

export function saveFinanceLedger(
  entries: readonly FinanceLedgerEntry[],
  storage?: StorageLike | null
): void {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!targetStorage) return;

  targetStorage.setItem(FINANCE_LEDGER_STORAGE_KEY, JSON.stringify(entries));
}

export function exportFinanceLedgerJSON(entries: readonly FinanceLedgerEntry[]): string {
  return JSON.stringify(
    {
      schema: 'bangla-ai-finance-ledger-v1',
      exportedAt: new Date().toISOString(),
      entries,
    },
    null,
    2
  );
}

export function parseImportedFinanceLedgerJSON(raw: string): FinanceLedgerEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Bangla AI finance backup JSON.');
  }

  let candidateList: unknown;
  if (Array.isArray(parsed)) {
    candidateList = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { entries?: unknown }).entries)) {
    candidateList = (parsed as { entries: unknown[] }).entries;
  } else {
    throw new Error('Backup JSON must contain an entries array.');
  }

  const valid = (candidateList as unknown[]).filter(isValidEntryRecord);
  if (valid.length === 0 && (candidateList as unknown[]).length > 0) {
    throw new Error('No valid ledger entries found inside the selected JSON file.');
  }
  return valid;
}

function escapeCSVCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportFinanceLedgerCSV(entries: readonly FinanceLedgerEntry[]): string {
  const headers = ['Date', 'Type', 'Plan / Title', 'Note', 'Amount (BDT)', 'Signed Amount (BDT)'];
  const rows = entries.map((entry) => {
    const typeLabel = entry.type === 'income' ? 'Sale / Income' : 'Ad Spend';
    const signedAmount = entry.type === 'income' ? entry.amountBDT : -entry.amountBDT;
    return [
      entry.date,
      typeLabel,
      entry.title,
      entry.note,
      entry.amountBDT,
      signedAmount,
    ]
      .map(escapeCSVCell)
      .join(',');
  });

  return [headers.map(escapeCSVCell).join(','), ...rows].join('\n');
}
