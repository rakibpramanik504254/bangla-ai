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
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-black dark:text-white leading-tight">
          Smarter Workflows
          <span className="block font-medium text-gray-900 dark:text-gray-100 mt-1">
            One AI Platform
          </span>
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
          Use Bangla AI for writing, research, coding, image generation, and everyday productivity — all from one simple workspace.
        </p>
      </div>

      {/* 2x2 Grid matching the user's reference design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Card 1: All AI-Models in One Platform */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D0D] overflow-hidden shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all group flex flex-col">
          {/* Visual Canvas */}
          <div className="h-64 sm:h-72 bg-gradient-to-b from-[#EEF4FF] via-[#F4F7FC] to-[#FAFBFE] dark:from-[#111827] dark:via-[#0F1420] dark:to-[#0A0D14] p-6 flex items-center justify-center relative overflow-hidden">
            {/* Soft decorative background circles */}
            <div className="absolute w-64 h-64 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 sm:gap-6 w-full max-w-md relative z-10">
              {/* Left Circular Model Selector Node */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-blue-400/30 animate-pulse absolute" />
                  <div className="w-16 h-16 rounded-full border border-blue-400/50 absolute" />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-2 text-center whitespace-nowrap">
                  Choose the best<br />ai model....
                </span>
              </div>

              {/* Connecting line */}
              <div className="h-[2px] w-6 bg-gradient-to-r from-blue-500 to-blue-400 shrink-0 hidden sm:block" />

              {/* Right Model Selection Card */}
              <div className="flex-1 bg-white dark:bg-[#161C2A] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-2.5 shadow-md space-y-1.5 text-xs">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-medium text-[11px]">Claude Opus 4.7</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium text-[11px]">Gemini 4 Carbon</span>
                </div>
                {/* Active Highlighted Item */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-[11px]">ChatGPT-5.5 / GPT-4o</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-mono bg-blue-500 text-white px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="font-medium text-[11px]">Claude Sonnet 3.5</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-medium text-[11px]">Grok 4.7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
              All AI-Models in One Platform
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Access supported models like ChatGPT, Gemini, Claude, Grok, and more from one simple workspace.
            </p>
          </div>
        </div>

        {/* Card 2: Generate images in seconds */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D0D] overflow-hidden shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all group flex flex-col">
          {/* Visual Canvas */}
          <div className="h-64 sm:h-72 bg-gradient-to-b from-[#EEF4FF] via-[#F4F7FC] to-[#FAFBFE] dark:from-[#111827] dark:via-[#0F1420] dark:to-[#0A0D14] p-5 sm:p-6 flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-sm bg-white dark:bg-[#161C2A] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5 shadow-md space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">
                  ✦
                </div>
                <span className="text-[11px] font-semibold text-black dark:text-white">Bangla AI</span>
                <span className="text-[10px] text-gray-400">· 1 min</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Your generated images are now ready for download:
              </p>

              {/* Gallery Grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Left slot */}
                <div className="aspect-square rounded-lg bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>

                {/* Center hero generated image */}
                <div className="aspect-square rounded-lg relative overflow-hidden group/img shadow-sm border border-blue-400/40">
                  <img
                    src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80"
                    alt="AI Generated Cyber Visual"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <span className="p-1 rounded-full bg-white/90 text-black">
                      <Eye className="w-3 h-3" />
                    </span>
                    <span className="p-1 rounded-full bg-white/90 text-black">
                      <Download className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Right slot */}
                <div className="aspect-square rounded-lg bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Generate images in seconds
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Create visuals for ads, social posts, websites, product ideas, and creative campaigns using AI image tools.
            </p>
          </div>
        </div>

        {/* Card 3: Research Faster with AI */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D0D] overflow-hidden shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all group flex flex-col">
          {/* Visual Canvas */}
          <div className="h-64 sm:h-72 bg-gradient-to-b from-[#EEF4FF] via-[#F4F7FC] to-[#FAFBFE] dark:from-[#111827] dark:via-[#0F1420] dark:to-[#0A0D14] p-5 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Top Root Node */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg relative z-10">
              <Network className="w-6 h-6 text-white" />
            </div>

            {/* Tree Branching Connector Lines */}
            <div className="w-0.5 h-6 bg-blue-400/60" />
            <div className="w-48 sm:w-64 h-0.5 bg-blue-400/60 relative">
              <div className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-blue-500" />
              <div className="absolute -top-1 left-1/3 w-2 h-2 rounded-full bg-blue-500" />
              <div className="absolute -top-1 left-2/3 w-2 h-2 rounded-full bg-blue-500" />
              <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="flex justify-between w-48 sm:w-64 h-4">
              <div className="w-0.5 h-full bg-blue-400/60" />
              <div className="w-0.5 h-full bg-blue-400/60" />
              <div className="w-0.5 h-full bg-blue-400/60" />
              <div className="w-0.5 h-full bg-blue-400/60" />
            </div>

            {/* Structured Concept Cards */}
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
              <div className="bg-white dark:bg-[#161C2A] p-2 rounded-lg border border-black/10 dark:border-white/10 text-center shadow-xs">
                <span className="text-[10px] font-mono text-gray-500 block truncate">Task 01</span>
                <span className="text-[9px] text-gray-400 block truncate">Synthesis</span>
              </div>
              <div className="bg-white dark:bg-[#161C2A] p-2 rounded-lg border border-black/10 dark:border-white/10 text-center shadow-xs">
                <span className="text-[10px] font-mono text-gray-500 block truncate">Task 02</span>
                <span className="text-[9px] text-gray-400 block truncate">Analysis</span>
              </div>
              <div className="bg-white dark:bg-[#161C2A] p-2 rounded-lg border border-black/10 dark:border-white/10 text-center shadow-xs">
                <span className="text-[10px] font-mono text-gray-500 block truncate">Task 03</span>
                <span className="text-[9px] text-gray-400 block truncate">Report</span>
              </div>
              <div className="bg-white dark:bg-[#161C2A] p-2 rounded-lg border border-black/10 dark:border-white/10 text-center shadow-xs">
                <span className="text-[10px] font-mono text-gray-500 block truncate">Task 04</span>
                <span className="text-[9px] text-gray-400 block truncate">Outline</span>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Research Faster with AI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Summarize information, compare ideas, prepare outlines, and create reports with help from multiple AI models.
            </p>
          </div>
        </div>

        {/* Card 4: Write Code More Easily Than Ever */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D0D] overflow-hidden shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all group flex flex-col">
          {/* Visual Canvas */}
          <div className="h-64 sm:h-72 bg-gradient-to-b from-[#EEF4FF] via-[#F4F7FC] to-[#FAFBFE] dark:from-[#111827] dark:via-[#0F1420] dark:to-[#0A0D14] p-5 sm:p-6 flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-sm bg-white dark:bg-[#161C2A] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5 shadow-md space-y-2.5">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">
                  ✦
                </div>
                <span className="text-[11px] font-semibold text-black dark:text-white">Bangla AI</span>
                <span className="text-[10px] text-gray-400">· 1 min</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Here is a simple Stripe checkout via JavaScript:
              </p>

              {/* Code Snippet Box */}
              <div className="bg-[#0B0F19] text-gray-200 rounded-lg p-3 font-mono text-[10px] leading-relaxed shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3 h-3 text-blue-400" />
                    <span>Javascript</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] hover:text-white cursor-pointer flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px]">
                      Edit
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">1 &lt;!-- Stripe js integration --&gt;</div>
                  <div>
                    <span className="text-gray-500">2 </span>
                    <span className="text-pink-400">&lt;script</span> <span className="text-amber-300">src</span>=<span className="text-emerald-300">"https://js.stripe.com/v3/"</span><span className="text-pink-400">&gt;&lt;/script&gt;</span>
                  </div>
                  <div className="text-gray-500">3 </div>
                  <div className="text-gray-500">4 &lt;!-- Checkout button --&gt;</div>
                  <div>
                    <span className="text-gray-500">5 </span>
                    <span className="text-pink-400">&lt;button</span> <span className="text-amber-300">id</span>=<span className="text-emerald-300">"checkout-button"</span><span className="text-pink-400">&gt;</span>Pay Now<span className="text-pink-400">&lt;/button&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-start">
            <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Write Code More Easily Than Ever
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Use AI to write, debug, explain, and improve code across your development workflow.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
