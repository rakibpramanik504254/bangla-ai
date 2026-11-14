import { PLANS, formatBDT } from './billing.ts';

export interface ComparisonAiTool {
  id: string;
  name: string;
  monthlyBDT: number;
  iconSrc: string;
  iconAlt: string;
  invertDark?: boolean;
  defaultSelected?: boolean;
}

export const COMPARISON_AI_TOOLS: readonly ComparisonAiTool[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    monthlyBDT: 2500,
    iconSrc: '/assets/aistudio/calc-openai_c4f23f92.svg',
    iconAlt: 'ChatGPT (OpenAI) logo',
    invertDark: true,
    defaultSelected: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    monthlyBDT: 2500,
    iconSrc: '/assets/aistudio/calc-claude_2a15ea2f.svg',
    iconAlt: 'Claude (Anthropic) logo',
    defaultSelected: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    monthlyBDT: 2500,
    iconSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
    iconAlt: 'Google Gemini logo',
    defaultSelected: true,
  },
  {
    id: 'grok',
    name: 'Grok',
    monthlyBDT: 3500,
    iconSrc: '/assets/aistudio/calc-grok_901d52d2.svg',
    iconAlt: 'xAI Grok logo',
    invertDark: true,
    defaultSelected: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    monthlyBDT: 2500,
    iconSrc: '/assets/aistudio/calc-perplexity_9920b037.svg',
    iconAlt: 'Perplexity AI logo',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    monthlyBDT: 1200,
    iconSrc: '/assets/aistudio/calc-deepseek_729ceac7.svg',
    iconAlt: 'DeepSeek logo',
  },
  {
    id: 'kimi',
    name: 'Kimi K3',
    monthlyBDT: 1500,
    iconSrc: '/assets/aistudio/calc-moonshot_e685cc14.svg',
    iconAlt: 'Moonshot Kimi logo',
    invertDark: true,
  },
  {
    id: 'kling',
    name: 'Kling AI',
    monthlyBDT: 1800,
    iconSrc: '/assets/aistudio/calc-kling_c93eff5c.png',
    iconAlt: 'Kling AI logo',
    invertDark: true,
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
  monthlyAnnualizedBDT: number;
  yearlyPriceBDT: number;
  yearlyEquivalentMonthlyBDT: number;
  yearlySavingsBDT: number;
}

export function getComparisonPlanInfo(): ComparisonPlanInfo {
  const monthlyPriceBDT = PLANS.monthly.priceBDT; // 699
  const monthlyAnnualizedBDT = monthlyPriceBDT * 12; // 8388
  const yearlyPriceBDT = PLANS.yearly.priceBDT; // 5999
  const yearlyEquivalentMonthlyBDT = PLANS.yearly.monthlyEquivalentBDT ?? 500;
  const yearlySavingsBDT = monthlyAnnualizedBDT - yearlyPriceBDT; // 2389

  return {
    monthlyPriceBDT,
    monthlyAnnualizedBDT,
    yearlyPriceBDT,
    yearlyEquivalentMonthlyBDT,
    yearlySavingsBDT,
  };
}

export function getPlanFeatures(planId: 'monthly' | 'yearly'): readonly string[] {
  return PLANS[planId].features;
}

export const COMPARISON_FEATURES: readonly string[] = PLANS.monthly.features;

