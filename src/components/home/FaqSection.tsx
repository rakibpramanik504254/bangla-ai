import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight leading-[1.18] text-black dark:text-white">
              Got questions about{' '}
              <span className="whitespace-nowrap">
                <span className="text-blue-600 dark:text-blue-400">Bangla-AI.pro</span>?
              </span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-left text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-medium'
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
                className={`rounded-2xl transition-all duration-150 overflow-hidden bg-white dark:bg-[#262626] ${
                  isOpen
                    ? 'border border-blue-600/65 dark:border-blue-400/65 shadow-[0_2px_12px_-4px_rgba(37,99,235,0.12)] dark:shadow-[0_4px_16px_-6px_rgba(59,130,246,0.18)]'
                    : 'border border-black/[0.08] dark:border-white/[0.1] hover:border-black/20 dark:hover:border-white/25'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => handleToggleItem(idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600"
                >
                  <span className="font-semibold text-xs sm:text-sm text-black dark:text-white leading-snug">
                    {item.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="w-4 h-4 text-gray-400 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-3 text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed border-t border-black/[0.06] dark:border-white/[0.06]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
