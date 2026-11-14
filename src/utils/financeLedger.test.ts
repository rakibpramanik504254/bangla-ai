import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCE_LEDGER_STORAGE_KEY,
  StorageLike,
  computeAdSpendComparison,
  computeMonthlyOverview,
  computeWeeklyOverview,
  createFinanceEntry,
  exportFinanceLedgerCSV,
  exportFinanceLedgerJSON,
  filterLedgerEntries,
  formatLocalDateISO,
  getYesterdayISO,
  loadFinanceLedger,
  parseImportedFinanceLedgerJSON,
  saveFinanceLedger,
  updateFinanceEntry,
} from './financeLedger.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('computeAdSpendComparison accurately compares Today vs Yesterday and ignores trashed entries', () => {
  const today = '2026-11-14';
  const yesterday = getYesterdayISO(today);
  assert.equal(yesterday, '2026-11-13');

  const entries = [
    createFinanceEntry({
      type: 'ad_spend',
      category: 'meta_ads',
      title: 'Meta Ads',
      note: 'Morning boost',
      amountBDT: 1500,
      date: today,
    }),
    createFinanceEntry({
      type: 'ad_spend',
      category: 'meta_ads',
      title: 'Meta Ads',
      note: 'Yesterday spend',
      amountBDT: 1000,
      date: yesterday,
    }),
    {
      ...createFinanceEntry({
        type: 'ad_spend',
        category: 'meta_ads',
        amountBDT: 9000,
        date: today,
      }),
      deletedAt: '2026-11-14T10:00:00.000Z',
    },
    // Income should not count toward ad spend
    createFinanceEntry({
      type: 'income',
      category: 'monthly_plan',
      amountBDT: 699,
      date: today,
    }),
  ];

  const cmp = computeAdSpendComparison(entries, today);
  assert.equal(cmp.todaySpendBDT, 1500);
  assert.equal(cmp.yesterdaySpendBDT, 1000);
  assert.equal(cmp.deltaBDT, 500);
  assert.equal(cmp.deltaPercent, 50);
  assert.equal(cmp.trend, 'higher');
});

test('computeWeeklyOverview totals current 7-day window income, ad spend, and net profit/loss', () => {
  const today = '2026-11-14';
  const entries = [
    // Inside 7-day window: Nov 8 .. Nov 14
    createFinanceEntry({ type: 'income', category: 'yearly_plan', amountBDT: 5999, date: '2026-11-08' }),
    createFinanceEntry({ type: 'income', category: 'monthly_plan', amountBDT: 699, date: '2026-11-14' }),
    createFinanceEntry({ type: 'ad_spend', category: 'meta_ads', amountBDT: 2500, date: '2026-11-12' }),
    // Outside 7-day window
    createFinanceEntry({ type: 'income', category: 'monthly_plan', amountBDT: 699, date: '2026-11-07' }),
    createFinanceEntry({ type: 'ad_spend', category: 'meta_ads', amountBDT: 5000, date: '2026-11-01' }),
  ];

  const weekly = computeWeeklyOverview(entries, today);
  assert.equal(weekly.startDate, '2026-11-08');
  assert.equal(weekly.endDate, '2026-11-14');
  assert.equal(weekly.incomeBDT, 6698);
  assert.equal(weekly.adSpendBDT, 2500);
  assert.equal(weekly.netProfitBDT, 4198);
  assert.equal(weekly.entryCount, 3);
});

test('computeMonthlyOverview calculates gross income, ad spend, net profit/loss, ROAS, and plan counts', () => {
  const entries = [
    createFinanceEntry({ type: 'income', category: 'monthly_plan', amountBDT: 699, date: '2026-11-02' }),
    createFinanceEntry({ type: 'income', category: 'monthly_plan', amountBDT: 699, date: '2026-11-10' }),
    createFinanceEntry({ type: 'income', category: 'yearly_plan', amountBDT: 5999, date: '2026-11-14' }),
    createFinanceEntry({ type: 'income', category: 'custom_income', amountBDT: 1003, date: '2026-11-14' }),
    createFinanceEntry({ type: 'ad_spend', category: 'meta_ads', amountBDT: 3500, date: '2026-11-14' }),
    // Different month
    createFinanceEntry({ type: 'income', category: 'yearly_plan', amountBDT: 5999, date: '2026-10-25' }),
  ];

  const nov = computeMonthlyOverview(entries, '2026-11');
  assert.equal(nov.grossIncomeBDT, 8400);
  assert.equal(nov.adSpendBDT, 3500);
  assert.equal(nov.netProfitBDT, 4900);
  assert.equal(nov.roas, 2.4);
  assert.equal(nov.monthlyPlanCount, 2);
  assert.equal(nov.yearlyPlanCount, 1);
  assert.equal(nov.customIncomeCount, 1);

  const zeroSpend = computeMonthlyOverview(
    [createFinanceEntry({ type: 'income', category: 'monthly_plan', amountBDT: 699, date: '2026-12-01' })],
    '2026-12'
  );
  assert.equal(zeroSpend.roas, null);
});

test('updateFinanceEntry moves dates and recalculates monthly totals cleanly', () => {
  const original = createFinanceEntry({
    type: 'income',
    category: 'monthly_plan',
    amountBDT: 699,
    note: 'bKash - Rahim',
    date: '2026-11-14',
  });

  const moved = updateFinanceEntry(original, {
    date: '2026-10-30',
    amountBDT: 5999,
    category: 'yearly_plan',
    title: 'Yearly Plan (৳5,999)',
    note: 'bKash - Rahim (Upgraded)',
  });

  assert.equal(moved.date, '2026-10-30');
  assert.equal(moved.amountBDT, 5999);
  assert.equal(computeMonthlyOverview([moved], '2026-11').grossIncomeBDT, 0);
  assert.equal(computeMonthlyOverview([moved], '2026-10').grossIncomeBDT, 5999);
});

test('filterLedgerEntries filters by active/trash, type, month, date, and search query', () => {
  const e1 = createFinanceEntry({
    type: 'income',
    category: 'monthly_plan',
    note: 'bKash - Rahim',
    amountBDT: 699,
    date: '2026-11-14',
  });
  const e2 = createFinanceEntry({
    type: 'ad_spend',
    category: 'meta_ads',
    title: 'Meta Ads - Video',
    note: 'Retargeting',
    amountBDT: 1200,
    date: '2026-11-13',
  });
  const e3 = {
    ...createFinanceEntry({
      type: 'income',
      category: 'yearly_plan',
      note: 'Nagad - Karim',
      amountBDT: 5999,
      date: '2026-10-15',
    }),
    deletedAt: '2026-11-14T08:00:00.000Z',
  };

  const all = [e1, e2, e3];

  const activeOnly = filterLedgerEntries(all, {
    view: 'active',
    typeFilter: 'all',
    monthFilter: 'all',
    dateFilter: '',
    searchQuery: '',
  });
  assert.deepEqual(activeOnly.map((e) => e.id), [e1.id, e2.id]);

  const trashOnly = filterLedgerEntries(all, {
    view: 'trash',
    typeFilter: 'all',
    monthFilter: 'all',
    dateFilter: '',
    searchQuery: '',
  });
  assert.deepEqual(trashOnly.map((e) => e.id), [e3.id]);

  const searchRahim = filterLedgerEntries(all, {
    view: 'active',
    typeFilter: 'income',
    monthFilter: '2026-11',
    dateFilter: '2026-11-14',
    searchQuery: 'rahim',
  });
  assert.deepEqual(searchRahim.map((e) => e.id), [e1.id]);
});

test('localStorage persistence, JSON export/import backup, and CSV export work cleanly', () => {
  const storage = createMemoryStorage();
  const entry = createFinanceEntry({
    type: 'income',
    category: 'monthly_plan',
    note: 'bKash, "Special" note',
    amountBDT: 699,
    date: formatLocalDateISO(new Date(2026, 10, 14)),
  });

  saveFinanceLedger([entry], storage);
  assert.ok(storage.getItem(FINANCE_LEDGER_STORAGE_KEY));

  const loaded = loadFinanceLedger(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].amountBDT, 699);

  const jsonBackup = exportFinanceLedgerJSON(loaded);
  const reimported = parseImportedFinanceLedgerJSON(jsonBackup);
  assert.equal(reimported.length, 1);
  assert.equal(reimported[0].note, 'bKash, "Special" note');

  const csv = exportFinanceLedgerCSV(loaded);
  assert.match(csv, /^Date,Type,Plan \/ Title,Note,Amount \(BDT\),Signed Amount \(BDT\)/);
  assert.match(csv, /"bKash, ""Special"" note"/);
});
