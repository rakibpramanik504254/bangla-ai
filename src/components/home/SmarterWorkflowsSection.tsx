import React from 'react';
import {
  Sparkles,
  Bot,
  Image as ImageIcon,
  Network,
  Code2,
  Copy,
  ExternalLink,
  Download,
  Eye,
  Check
} from 'lucide-react';

export const SmarterWorkflowsSection: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-12 sm:mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-tight">
          Smarter Workflows
          <span className="block font-medium text-[#444746] dark:text-[#9aa0a6] mt-1">
            One AI Platform
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#444746] dark:text-[#9aa0a6] max-w-xl mx-auto leading-[1.7]">
          Use Bangla AI for writing, research, coding, image generation, and everyday productivity — all from one simple workspace.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Card 1: All AI-Models in One Platform */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-colors group flex flex-col min-w-0">
          {/* Visual Canvas */}
          <div className="min-h-64 h-auto sm:h-72 bg-[#f0f4f9] dark:bg-[#131314] p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
            <div className="flex items-center gap-2.5 sm:gap-6 w-full max-w-md relative z-10 min-w-0">
              {/* Left Circular Model Selector Node */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-black/[0.08] dark:border-white/[0.08] absolute" />
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-black/[0.12] dark:border-white/[0.12] absolute" />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] flex items-center justify-center">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] mt-1.5 sm:mt-2 text-center whitespace-nowrap">
                  Choose the best<br />ai model....
                </span>
              </div>

              {/* Connecting line */}
              <div className="h-[1px] w-6 bg-black/[0.15] dark:bg-white/[0.15] shrink-0 hidden sm:block" />

              {/* Right Model Selection Card */}
              <div className="flex-1 min-w-0 bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-2 sm:p-2.5 space-y-1 sm:space-y-1.5 text-xs">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[#444746] dark:text-[#9aa0a6] min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500/80 shrink-0" />
                  <span className="font-medium text-[10px] sm:text-[11px] truncate">Claude Fable 5.2</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[#444746] dark:text-[#9aa0a6] min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500/80 shrink-0" />
                  <span className="font-medium text-[10px] sm:text-[11px] truncate">Gemini 4 Carbon</span>
                </div>
                {/* Active Highlighted Item */}
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border border-black/[0.12] dark:border-white/[0.15] bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] truncate">GPT-6 Astra / GPT-4o</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-mono bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] px-1.5 py-0.5 rounded-full shrink-0">Active</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[#444746] dark:text-[#9aa0a6] min-w-0">
                  <span className="w-2 h-2 rounded-full bg-orange-500/80 shrink-0" />
                  <span className="font-medium text-[10px] sm:text-[11px] truncate">Claude 3.5 Sonnet</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[#444746] dark:text-[#9aa0a6] min-w-0">
                  <span className="w-2 h-2 rounded-full bg-neutral-500 shrink-0" />
                  <span className="font-medium text-[10px] sm:text-[11px] truncate">Grok 4.7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              All AI-Models in One Platform
            </h3>
            <p className="text-sm text-[#444746] dark:text-[#9aa0a6] mt-2 leading-[1.7]">
              Access supported models like ChatGPT, Gemini, Claude, Grok, and more from one simple workspace.
            </p>
          </div>
        </div>

        {/* Card 2: Generate images in seconds */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-colors group flex flex-col min-w-0">
          {/* Visual Canvas */}
          <div className="min-h-64 h-auto sm:h-72 bg-[#f0f4f9] dark:bg-[#131314] p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-sm bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-3.5 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
                <div className="w-4 h-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] flex items-center justify-center text-[9px] text-white dark:text-[#131314] font-bold">
                  ✦
                </div>
                <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Bangla AI</span>
                <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">· 1 min</span>
              </div>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                Your generated images are now ready for download:
              </p>

              {/* Gallery Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#444746] dark:text-[#9aa0a6]" />
                </div>

                <div className="aspect-square rounded-xl relative overflow-hidden group/img border border-black/[0.12] dark:border-white/[0.12]">
                  <img
                    src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80"
                    alt="AI Generated Cyber Visual"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <span className="p-1 rounded-full bg-white/90 text-[#1f1f1f]">
                      <Eye className="w-3 h-3" />
                    </span>
                    <span className="p-1 rounded-full bg-white/90 text-[#1f1f1f]">
                      <Download className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                <div className="aspect-square rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#444746] dark:text-[#9aa0a6]" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              Generate images in seconds
            </h3>
            <p className="text-sm text-[#444746] dark:text-[#9aa0a6] mt-2 leading-[1.7]">
              Create visuals for ads, social posts, websites, product ideas, and creative campaigns using AI image tools.
            </p>
          </div>
        </div>

        {/* Card 3: Research Faster with AI */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-colors group flex flex-col min-w-0">
          {/* Visual Canvas */}
          <div className="min-h-64 h-auto sm:h-72 bg-[#f0f4f9] dark:bg-[#131314] p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Top Root Node */}
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] flex items-center justify-center relative z-10">
              <Network className="w-6 h-6" />
            </div>

            {/* Tree Branching Connector Lines */}
            <div className="w-px h-6 bg-black/20 dark:bg-white/20" />
            <div className="w-44 sm:w-64 h-px bg-black/20 dark:bg-white/20 relative">
              <div className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3]" />
              <div className="absolute -top-1 left-1/3 w-2 h-2 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3]" />
              <div className="absolute -top-1 left-2/3 w-2 h-2 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3]" />
              <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3]" />
            </div>
            <div className="flex justify-between w-44 sm:w-64 h-4">
              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
            </div>

            {/* Structured Concept Cards */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-sm">
              <div className="bg-white dark:bg-[#1e1f20] p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-center">
                <span className="text-[10px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] block truncate">Task 01</span>
                <span className="text-[9px] text-[#444746] dark:text-[#9aa0a6] block truncate">Synthesis</span>
              </div>
              <div className="bg-white dark:bg-[#1e1f20] p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-center">
                <span className="text-[10px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] block truncate">Task 02</span>
                <span className="text-[9px] text-[#444746] dark:text-[#9aa0a6] block truncate">Analysis</span>
              </div>
              <div className="bg-white dark:bg-[#1e1f20] p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-center">
                <span className="text-[10px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] block truncate">Task 03</span>
                <span className="text-[9px] text-[#444746] dark:text-[#9aa0a6] block truncate">Report</span>
              </div>
              <div className="bg-white dark:bg-[#1e1f20] p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-center">
                <span className="text-[10px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] block truncate">Task 04</span>
                <span className="text-[9px] text-[#444746] dark:text-[#9aa0a6] block truncate">Outline</span>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              Research Faster with AI
            </h3>
            <p className="text-sm text-[#444746] dark:text-[#9aa0a6] mt-2 leading-[1.7]">
              Summarize information, compare ideas, prepare outlines, and create reports with help from multiple AI models.
            </p>
          </div>
        </div>

        {/* Card 4: Write Code More Easily Than Ever */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-colors group flex flex-col min-w-0">
          {/* Visual Canvas */}
          <div className="min-h-64 h-auto sm:h-72 bg-[#f0f4f9] dark:bg-[#131314] p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-sm min-w-0 bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-3 sm:p-3.5 space-y-2.5">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
                <div className="w-4 h-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] flex items-center justify-center text-[9px] text-white dark:text-[#131314] font-bold shrink-0">
                  ✦
                </div>
                <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Bangla AI</span>
                <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">· 1 min</span>
              </div>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                Here is a simple checkout snippet via JavaScript:
              </p>

              {/* Code Snippet Box */}
              <div className="bg-[#131314] text-gray-200 rounded-xl p-2.5 sm:p-3 font-mono text-[10px] leading-relaxed border border-white/[0.08] overflow-x-auto max-w-full">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3 h-3 text-[#9aa0a6] shrink-0" />
                    <span>Javascript</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#e3e3e3] text-[#131314] font-semibold text-[9px]">
                      Edit
                    </span>
                  </div>
                </div>
                <div className="break-all sm:break-normal">
                  <div className="text-gray-500">1 &lt;!-- Checkout integration --&gt;</div>
                  <div>
                    <span className="text-gray-500">2 </span>
                    <span className="text-pink-300">&lt;script</span> <span className="text-amber-300">src</span>=<span className="text-emerald-300">"https://js.stripe.com/v3/"</span><span className="text-pink-300">&gt;&lt;/script&gt;</span>
                  </div>
                  <div className="text-gray-500">3 </div>
                  <div className="text-gray-500">4 &lt;!-- Checkout button --&gt;</div>
                  <div>
                    <span className="text-gray-500">5 </span>
                    <span className="text-pink-300">&lt;button</span> <span className="text-amber-300">id</span>=<span className="text-emerald-300">"checkout-button"</span><span className="text-pink-300">&gt;</span>Pay Now<span className="text-pink-300">&lt;/button&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              Write Code More Easily Than Ever
            </h3>
            <p className="text-sm text-[#444746] dark:text-[#9aa0a6] mt-2 leading-[1.7]">
              Use AI to write, debug, explain, and improve code across your development workflow.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
