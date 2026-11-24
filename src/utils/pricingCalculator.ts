import { PLANS, formatBDT } from './billing.ts';

export type ComparisonToolIconKey =
  | 'message'
  | 'code'
  | 'layers'
  | 'zap'
  | 'search'
  | 'cpu'
  | 'file'
  | 'image';

export interface ComparisonAiTool {
  id: string;
  name: string;
  shortLabel: string;
  monthlyBDT: number;
  iconKey: ComparisonToolIconKey;
  defaultSelected?: boolean;
}

export const COMPARISON_AI_TOOLS: readonly ComparisonAiTool[] = [
  {
    id: 'general-chat',
    name: 'General AI Chat',
    shortLabel: 'Chat AI',
    monthlyBDT: 2500,
    iconKey: 'message',
    defaultSelected: true,
  },
  {
    id: 'coding-assistant',
    name: 'Pro Coding AI',
    shortLabel: 'Coding',
    monthlyBDT: 2500,
    iconKey: 'code',
    defaultSelected: true,
  },
  {
    id: 'long-context',
    name: 'Long-Context AI',
    shortLabel: '2M Docs',
    monthlyBDT: 2500,
    iconKey: 'layers',
    defaultSelected: true,
  },
  {
    id: 'deep-reasoning',
    name: 'Deep Reasoning AI',
    shortLabel: 'Reasoning',
    monthlyBDT: 3500,
    iconKey: 'zap',
    defaultSelected: true,
  },
  {
    id: 'web-research',
    name: 'Research Synthesis',
    shortLabel: 'Research',
    monthlyBDT: 2500,
    iconKey: 'search',
  },
  {
    id: 'math-logic',
    name: 'Math & Logic Engine',
    shortLabel: 'Math AI',
    monthlyBDT: 1200,
    iconKey: 'cpu',
  },
  {
    id: 'document-digest',
    name: 'Document Analysis',
    shortLabel: 'Files AI',
    monthlyBDT: 1500,
    iconKey: 'file',
  },
  {
    id: 'visual-studio',
    name: 'AI Image Studio',
    shortLabel: 'Images',
    monthlyBDT: 1800,
    iconKey: 'image',
  },
] as const;

export const DEFAULT_SELECTED_TOOL_IDS: readonly string[] = COMPARISON_AI_TOOLS.filter(
  (tool) => tool.defaultSelected
).map((tool) => tool.id);

export function toggleToolSelection(selectedIds: readonly string[], toolId: string): string[] {
  if (selectedIds.includes(toolId)) {
    return selectedIds.filter((id) => id !== toolId);
  }
  return [...selectedIds, toolId];
}

export interface TodayCostSummary {
  selectedTools: ComparisonAiTool[];
  count: number;
  totalMonthlyBDT: number;
  formattedTotalBDT: string;
  toolsBadgeLabel: string;
  loginsLabel: string;
}

export function calculateTodayCostSummary(
  selectedIds: readonly string[],
  tools: readonly ComparisonAiTool[] = COMPARISON_AI_TOOLS
): TodayCostSummary {
  const selectedSet = new Set(selectedIds);
  const selectedTools = tools.filter((tool) => selectedSet.has(tool.id));
  const count = selectedTools.length;
  const totalMonthlyBDT = selectedTools.reduce((sum, tool) => sum + tool.monthlyBDT, 0);

  return {
    selectedTools,
    count,
    totalMonthlyBDT,
    formattedTotalBDT: formatBDT(totalMonthlyBDT),
    toolsBadgeLabel: `${count} ${count === 1 ? 'TOOL' : 'TOOLS'}`,
    loginsLabel: `${count} separate ${count === 1 ? 'login' : 'logins'} · ${count} ${count === 1 ? 'bill' : 'bills'} to track`,
  };
}

export interface ComparisonPlanInfo {
  monthlyPriceBDT: number;
  monthlyRegularPriceBDT: number;
  monthlyAnnualizedBDT: number;
  yearlyPriceBDT: number;
  yearlyRegularPriceBDT: number;
  yearlyEquivalentMonthlyBDT: number;
  yearlySavingsBDT: number;
}

export function getComparisonPlanInfo(): ComparisonPlanInfo {
  const monthlyPriceBDT = PLANS.monthly.priceBDT; // 699
  const monthlyRegularPriceBDT = 1499;
  const monthlyAnnualizedBDT = monthlyPriceBDT * 12; // 8388
  const yearlyPriceBDT = PLANS.yearly.priceBDT; // 5999
  const yearlyRegularPriceBDT = 14999;
  const yearlyEquivalentMonthlyBDT = PLANS.yearly.monthlyEquivalentBDT ?? 500;
  const yearlySavingsBDT = monthlyAnnualizedBDT - yearlyPriceBDT; // 2389

  return {
    monthlyPriceBDT,
    monthlyRegularPriceBDT,
    monthlyAnnualizedBDT,
    yearlyPriceBDT,
    yearlyRegularPriceBDT,
    yearlyEquivalentMonthlyBDT,
    yearlySavingsBDT,
  };
}

export function getPlanFeatures(planId: 'monthly' | 'yearly'): readonly string[] {
  return PLANS[planId].features;
}

export const COMPARISON_FEATURES: readonly string[] = PLANS.monthly.features;
