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
      <div className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-8 lg:p-11">
        {/* Centered Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-3">
          <div className="flex justify-center">
            <span
              data-testid="pricing-urgency-pill"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] text-[11px] sm:text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] shadow-2xs"
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
              </span>
              <span>Limited-Time Offer · Lock in your rate before standard pricing applies</span>
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.15] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
            The best value in AI
          </h2>
          <p className="text-sm sm:text-base text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
            One subscription replaces every model and app for less than you already spend.
          </p>
        </div>

        {/* Two-Column Comparison Cards + Center VS Badge */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_auto_minmax(0,1.18fr)] gap-4 lg:gap-4 items-stretch">
          {/* Left Card: WHAT YOU PAY TODAY */}
          <div className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/[0.08] dark:bg-red-500/[0.12] border border-red-500/20 text-red-700 dark:text-red-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>WHAT YOU PAY TODAY</span>
                </span>
                <span
                  data-testid="selected-tools-count"
                  className="text-[11px] font-mono font-semibold text-[#444746] dark:text-[#9aa0a6] uppercase tracking-wider tabular-nums shrink-0"
                >
                  {summary.toolsBadgeLabel}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] font-medium text-[#444746] dark:text-[#9aa0a6] mb-3.5">
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
                      className={`relative aspect-square rounded-xl flex items-center justify-center p-2.5 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                        isSelected
                          ? 'bg-[#e9eef6] dark:bg-[#282a2c] border-2 border-[#1f1f1f] dark:border-[#e3e3e3] opacity-100'
                          : 'bg-[#f0f4f9]/70 dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] opacity-60 hover:opacity-90 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] flex items-center justify-center"
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
                        <span className="w-6 h-6 rounded-lg bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                          <img
                            src={tool.iconSrc}
                            alt=""
                            aria-hidden="true"
                            className={`w-4 h-4 object-contain ${tool.invertDark ? 'dark:invert' : ''}`}
                          />
                        </span>
                        <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                          {tool.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums shrink-0">
                        {formatBDT(tool.monthlyBDT)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
                    Select one or more AI tools above to calculate your current monthly cost.
                  </p>
                )}
              </div>
            </div>

            {/* Left Card Summary Footer */}
            <div className="mt-5 pt-4 px-4 py-3.5 rounded-xl bg-red-500/[0.05] dark:bg-red-500/[0.09] border border-red-500/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">Total</p>
                <p className="text-[11px] leading-snug text-[#444746] dark:text-[#9aa0a6]">
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
                <span className="text-xs font-medium text-red-600/80 dark:text-red-400/90 ml-0.5">
                  /month
                </span>
              </div>
            </div>
          </div>

          {/* Center Circular VS Badge */}
          <div className="flex items-center justify-center py-0.5 lg:py-0">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-xs font-bold tracking-wider flex items-center justify-center ring-4 ring-[#f0f4f9] dark:ring-[#1e1f20]"
            >
              VS
            </div>
          </div>

          {/* Right Card: Interactive Plan Selector (Monthly vs Yearly) */}
          <div className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              {/* Side-by-Side Interactive Monthly vs Yearly Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 sm:gap-3.5 pt-2.5">
                {/* Option 1: Pay monthly */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  aria-pressed={selectedPlan === 'monthly'}
                  data-testid="plan-option-monthly"
                  className={`relative text-left rounded-xl p-4 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                    selectedPlan === 'monthly'
                      ? 'border-2 border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#e9eef6] dark:bg-[#282a2c]'
                      : 'border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#1e1f20] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  {/* Subtle top-right offer tag */}
                  <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#131314] border border-black/[0.1] dark:border-white/[0.14] text-[#444746] dark:text-[#c4c7c5] text-[10px] font-semibold tracking-tight whitespace-nowrap">
                    Limited time Offer
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Pay monthly
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedPlan === 'monthly'
                          ? 'border-[#1f1f1f] bg-[#1f1f1f] dark:border-[#e3e3e3] dark:bg-[#e3e3e3]'
                          : 'border-black/25 dark:border-white/25 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'monthly' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#131314]" />
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap">
                    <span className="text-xl xl:text-[22px] font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.monthlyPriceBDT)}
                    </span>
                    <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] whitespace-nowrap">
                      /month
                    </span>
                    <span className="text-[11px] font-mono text-[#444746]/75 dark:text-[#9aa0a6]/75 line-through tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.monthlyRegularPriceBDT)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                    Lock in 53% off · Regular price {formatBDT(planInfo.monthlyRegularPriceBDT)}/mo
                  </p>
                </button>

                {/* Option 2: Pay once a year */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  aria-pressed={selectedPlan === 'yearly'}
                  data-testid="plan-option-yearly"
                  className={`relative text-left rounded-xl p-4 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                    selectedPlan === 'yearly'
                      ? 'border-2 border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#e9eef6] dark:bg-[#282a2c]'
                      : 'border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#1e1f20] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  {/* Prominent dark pill badge at top-right */}
                  <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[10px] font-bold tracking-tight whitespace-nowrap">
                    Best Value · Save 60%
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Pay once a year
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedPlan === 'yearly'
                          ? 'border-[#1f1f1f] bg-[#1f1f1f] dark:border-[#e3e3e3] dark:bg-[#e3e3e3]'
                          : 'border-black/25 dark:border-white/25 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'yearly' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#131314]" />
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap">
                    <span className="text-xl xl:text-[22px] font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.yearlyPriceBDT)}
                    </span>
                    <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] whitespace-nowrap">
                      /year
                    </span>
                    <span className="text-[11px] font-mono text-[#444746]/75 dark:text-[#9aa0a6]/75 line-through tabular-nums whitespace-nowrap">
                      {formatBDT(planInfo.yearlyRegularPriceBDT)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                    Just {formatBDT(planInfo.yearlyEquivalentMonthlyBDT)}/month · Price increases soon
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
                    className="py-3 flex items-start gap-2.5 text-xs sm:text-[13px] text-[#444746] dark:text-[#e3e3e3] leading-snug"
                  >
                    <span
                      aria-hidden="true"
                      className="w-4.5 h-4.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Primary Call-to-Action Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleBuyNow}
                data-selected-plan={selectedPlan}
                data-testid="pricing-cta-btn"
                className="btn-pill-primary w-full h-11 text-sm font-semibold justify-center cursor-pointer"
              >
                Get Instant Access →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
