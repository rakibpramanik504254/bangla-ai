import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import {
  COMPARISON_AI_TOOLS,
  DEFAULT_SELECTED_TOOL_IDS,
  calculateTodayCostSummary,
  getComparisonPlanInfo,
  getPlanFeatures,
  toggleToolSelection,
} from '../../utils/pricingCalculator.ts';

export const PricingComparisonSection: React.FC = () => {
  const { user, openAuthModal, openPaymentModal } = useAuth();
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([...DEFAULT_SELECTED_TOOL_IDS]);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const summary = useMemo(
    () => calculateTodayCostSummary(selectedToolIds),
    [selectedToolIds]
  );

  const planInfo = useMemo(() => getComparisonPlanInfo(), []);
  const activeFeatures = useMemo(() => getPlanFeatures(selectedPlan), [selectedPlan]);

  const handleToggleTool = (toolId: string) => {
    setSelectedToolIds((prev) => toggleToolSelection(prev, toolId));
  };

  const handleBuyNow = () => {
    if (!user) {
      openAuthModal('register');
    } else {
      openPaymentModal(selectedPlan);
    }
  };

  return (
    <section
      id="pricing"
      aria-label="Pricing and AI Value Comparison"
      className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-24"
    >
      <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#242424] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)] p-5 sm:p-8 lg:p-11">
        {/* Centered Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.15] text-black dark:text-white text-balance">
            The best value in AI
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            One subscription replaces every model and app for less than you already spend.
          </p>
        </div>

        {/* Two-Column Comparison Cards + Center VS Badge */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_auto_minmax(0,1.18fr)] gap-4 lg:gap-4 items-stretch">
          {/* Left Card: WHAT YOU PAY TODAY */}
          <div className="rounded-2xl bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/[0.07] dark:bg-red-500/[0.12] border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>WHAT YOU PAY TODAY</span>
                </span>
                <span
                  data-testid="selected-tools-count"
                  className="text-[11px] font-mono font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider tabular-nums shrink-0"
                >
                  {summary.toolsBadgeLabel}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-3.5">
                Which AI models do you use?
              </p>

              {/* Interactive Model Icon Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {COMPARISON_AI_TOOLS.map((tool) => {
                  const isSelected = selectedToolIds.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleToggleTool(tool.id)}
                      aria-pressed={isSelected}
                      aria-label={`Toggle ${tool.name} (${formatBDT(tool.monthlyBDT)}/month)`}
                      title={`${tool.name} • ${formatBDT(tool.monthlyBDT)}/mo`}
                      className={`relative aspect-square rounded-xl flex items-center justify-center p-2.5 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isSelected
                          ? 'bg-blue-50/40 dark:bg-blue-950/25 border-2 border-blue-600 dark:border-blue-400 shadow-xs opacity-100'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.1] opacity-55 hover:opacity-85 hover:border-black/20 dark:hover:border-white/25'
                      }`}
                    >
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <img
                        src={tool.iconSrc}
                        alt={tool.iconAlt}
                        className={`w-7 h-7 object-contain select-none ${tool.invertDark ? 'dark:invert' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Selected Models Breakdown */}
              <div className="mt-5 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {summary.selectedTools.length > 0 ? (
                  summary.selectedTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-[13px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                          <img
                            src={tool.iconSrc}
                            alt=""
                            aria-hidden="true"
                            className={`w-4 h-4 object-contain ${tool.invertDark ? 'dark:invert' : ''}`}
                          />
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {tool.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-black dark:text-white tabular-nums shrink-0">
                        {formatBDT(tool.monthlyBDT)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    Select one or more AI tools above to calculate your current monthly cost.
                  </p>
                )}
              </div>
            </div>

            {/* Left Card Summary Footer */}
            <div className="mt-5 pt-4 px-4 py-3.5 rounded-xl bg-red-500/[0.04] dark:bg-red-500/[0.08] border border-red-500/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-black dark:text-white">Total</p>
                <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  {summary.loginsLabel}
                </p>
              </div>
              <div className="text-right shrink-0 whitespace-nowrap">
                <span
                  data-testid="today-total-cost"
                  className="text-xl sm:text-[22px] font-bold font-mono text-red-600 dark:text-red-400 tabular-nums"
                >
                  {summary.formattedTotalBDT}
                </span>
                <span className="text-xs font-medium text-red-500 dark:text-red-400/90 ml-0.5">
                  /month
                </span>
              </div>
            </div>
          </div>

          {/* Center Circular VS Badge */}
          <div className="flex items-center justify-center py-0.5 lg:py-0">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold tracking-wider flex items-center justify-center shadow-xs ring-4 ring-[#F8F9FA] dark:ring-[#242424]"
            >
              VS
            </div>
          </div>

          {/* Right Card: Interactive Plan Selector (Monthly vs Yearly) */}
          <div className="rounded-2xl bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              {/* Side-by-Side Interactive Monthly vs Yearly Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Pay monthly */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  aria-pressed={selectedPlan === 'monthly'}
                  className={`relative text-left rounded-xl p-4 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    selectedPlan === 'monthly'
                      ? 'border-2 border-blue-600 dark:border-blue-400 bg-blue-50/45 dark:bg-blue-950/25'
                      : 'border border-black/[0.1] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/25 dark:hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Pay monthly
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedPlan === 'monthly'
                          ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                          : 'border-gray-300 dark:border-gray-600 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'monthly' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-xl sm:text-[22px] xl:text-2xl font-bold font-mono text-black dark:text-white tabular-nums">
                      {formatBDT(planInfo.monthlyPriceBDT)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">/month</span>
                  </div>

                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    That&apos;s {formatBDT(planInfo.monthlyAnnualizedBDT)} a year
                  </p>
                </button>

                {/* Option 2: Pay once a year */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  aria-pressed={selectedPlan === 'yearly'}
                  className={`relative text-left rounded-xl p-4 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    selectedPlan === 'yearly'
                      ? 'border-2 border-blue-600 dark:border-blue-400 bg-blue-50/45 dark:bg-blue-950/25'
                      : 'border border-black/[0.1] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/25 dark:hover:border-white/25'
                  }`}
                >
                  {/* Floating dark pill badge at top-right */}
                  <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold tracking-tight whitespace-nowrap shadow-xs">
                    Save {formatBDT(planInfo.yearlySavingsBDT)}
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Pay once a year
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedPlan === 'yearly'
                          ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                          : 'border-gray-300 dark:border-gray-600 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'yearly' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xl sm:text-[22px] xl:text-2xl font-bold font-mono text-black dark:text-white tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.yearlyPriceBDT)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      /year
                    </span>
                    <span className="text-xs font-mono text-gray-400 line-through tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.monthlyAnnualizedBDT)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Just {formatBDT(planInfo.yearlyEquivalentMonthlyBDT)}/month, billed yearly
                  </p>
                </button>
              </div>

              {/* Clean Divided Dynamic Plan Checklist */}
              <ul
                data-testid="plan-features-list"
                className="mt-5 divide-y divide-black/[0.06] dark:divide-white/[0.06]"
              >
                {activeFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="py-3 flex items-start gap-2.5 text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 leading-snug"
                  >
                    <span
                      aria-hidden="true"
                      className="w-4.5 h-4.5 rounded-full border border-blue-600/30 bg-blue-500/[0.08] text-blue-600 dark:border-blue-400/35 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Primary Call-to-Action Button */}
            <div className="mt-5 pt-1">
              <button
                type="button"
                onClick={handleBuyNow}
                data-selected-plan={selectedPlan}
                className="btn-pill-primary w-full h-11 text-sm font-semibold justify-center cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
