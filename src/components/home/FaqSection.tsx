import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { FAQ_CATEGORIES, type FaqCategory, getFaqCategoryById } from '../../utils/faqData.ts';

export const FaqSection: React.FC = () => {
  const [activeCategoryId, setActiveCategoryId] = useState<FaqCategory['id']>(
    FAQ_CATEGORIES[0].id
  );
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const activeCategory = getFaqCategoryById(activeCategoryId);

  const handleSelectCategory = (categoryId: FaqCategory['id']) => {
    setActiveCategoryId(categoryId);
    setOpenIndex(0);
  };

  const handleToggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-24"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Sticky Column: Heading + Category Navigation */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="space-y-2.5">
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight leading-[1.18] text-[#1f1f1f] dark:text-[#e3e3e3]">
              Got questions about{' '}
              <span className="whitespace-nowrap">
                <span className="text-[#1f1f1f] dark:text-[#e3e3e3] underline decoration-black/20 dark:decoration-white/25 underline-offset-4">Bangla-AI.pro</span>?
              </span>
            </h2>
            <p className="text-sm text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Find answers to commonly asked questions.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="FAQ categories"
            className="flex flex-wrap lg:flex-nowrap lg:flex-col gap-1.5"
          >
            {FAQ_CATEGORIES.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`faq-panel-${category.id}`}
                  id={`faq-tab-${category.id}`}
                  onClick={() => handleSelectCategory(category.id)}
                  className={`px-4 py-2 sm:py-2.5 rounded-full text-left text-xs sm:text-sm whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                    isActive
                      ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold border border-black/[0.08] dark:border-white/[0.1]'
                      : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] font-medium border border-transparent'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Accordion Cards */}
        <div
          role="tabpanel"
          id={`faq-panel-${activeCategory.id}`}
          aria-labelledby={`faq-tab-${activeCategory.id}`}
          className="lg:col-span-7 space-y-3"
        >
          {activeCategory.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={`${activeCategory.id}-${item.question}`}
                className={`rounded-2xl transition-colors duration-150 overflow-hidden ${
                  isOpen
                    ? 'bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.14] dark:border-white/[0.16]'
                    : 'bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/15 dark:hover:border-white/15'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => handleToggleItem(idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3]"
                >
                  <span className="font-semibold text-xs sm:text-sm text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                    {item.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp
                      className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-3 text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.7] border-t border-black/[0.06] dark:border-white/[0.06]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Supported payment channels strip */}
      <div className="mt-12 sm:mt-14 flex justify-center">
        <div
          data-testid="faq-payment-channels-bar"
          className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-2.5 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] text-xs"
        >
          <div className="flex items-center gap-2 text-[#444746] dark:text-[#9aa0a6]">
            <ShieldCheck
              className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0"
              aria-hidden="true"
            />
            <span>Supported payment channels:</span>
          </div>
          <div className="flex items-center gap-2.5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
            <span>bKash</span>
            <span aria-hidden="true" className="text-[#444746]/50 dark:text-[#9aa0a6]/50">
              ·
            </span>
            <span>Nagad</span>
            <span aria-hidden="true" className="text-[#444746]/50 dark:text-[#9aa0a6]/50">
              ·
            </span>
            <span>Rocket</span>
          </div>
        </div>
      </div>
    </section>
  );
};
