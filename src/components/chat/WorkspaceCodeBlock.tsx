import React, { useState } from 'react';
import { Check, Copy, Download, WrapText, Terminal } from 'lucide-react';
import { tokenizeCodeLine, TokenType } from '../../utils/syntaxHighlight.ts';
import { getSuggestedFilename } from '../../utils/markdownBlocks.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';

interface WorkspaceCodeBlockProps {
  code: string;
  language?: string;
  index?: number;
  isStreaming?: boolean;
}

const IDE_TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: 'text-[#C678DD] font-medium',
  string: 'text-[#98C379]',
  comment: 'text-[#7F848E] italic',
  function: 'text-[#61AFEF]',
  type: 'text-[#E5C07B]',
  number: 'text-[#D19A66]',
  operator: 'text-[#56B6C2]',
  punctuation: 'text-[#848B98]',
  property: 'text-[#E06C75]',
  plain: 'text-[#E4E7EF]'
};

export const WorkspaceCodeBlock: React.FC<WorkspaceCodeBlockProps> = ({
  code,
  language = 'code',
  index = 0,
  isStreaming = false
}) => {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  const lines = code.split('\n');
  const displayLang = (language || 'code').trim() || 'code';
  const filename = getSuggestedFilename(displayLang, index);

  const handleCopy = async () => {
    await copyTextSafely(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="workspace-ide-code-block"
      className="my-3 rounded-[10px] overflow-hidden border border-black/15 dark:border-white/12 bg-[#161920] text-[#E4E7EF] shadow-sm min-w-0 max-w-full w-full"
    >
      {/* IDE Window Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#1E222D] border-b border-white/[0.08] text-[11px] font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-[#61AFEF] shrink-0" />
          <span className="text-[#E4E7EF] font-semibold uppercase tracking-wider text-[10px] truncate">
            {displayLang}
          </span>
          <span className="text-white/25" aria-hidden="true">
            ·
          </span>
          <span className="text-[#848B98] text-[10px] tabular-nums whitespace-nowrap">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
            {isStreaming ? ' · streaming' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 font-sans">
          <button
            type="button"
            onClick={() => setWrapLines(prev => !prev)}
            title={wrapLines ? 'Disable line wrapping' : 'Wrap long lines'}
            aria-label={wrapLines ? 'Disable line wrapping' : 'Wrap long lines'}
            className={`h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              wrapLines
                ? 'bg-[#61AFEF]/20 text-[#61AFEF]'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <WrapText className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Wrap</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title={`Download ${filename}`}
            aria-label={`Download ${filename}`}
            className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code block"
            className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.14] text-gray-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 shrink-0" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Syntax-Highlighted IDE Lines */}
      <div
        className={`py-3 font-mono text-[11.5px] sm:text-[12.5px] leading-[1.65] max-w-full ${
          wrapLines ? 'overflow-x-hidden' : 'overflow-x-auto'
        }`}
      >
        <div className={wrapLines ? 'w-full min-w-0' : 'min-w-max'}>
          {lines.map((line, lineIdx) => {
            const tokens = tokenizeCodeLine(line, displayLang);
            return (
              <div
                key={lineIdx}
                className="flex items-start px-3 sm:px-4 hover:bg-white/[0.03] transition-colors"
              >
                <span className="select-none text-[#4B5263] text-[11px] w-7 sm:w-8 pr-3 text-right shrink-0 tabular-nums pt-[1px]">
                  {lineIdx + 1}
                </span>
                <code
                  className={`flex-1 min-w-0 ${
                    wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  }`}
                >
                  {tokens.length === 0 ? (
                    ' '
                  ) : (
                    tokens.map((tok, tIdx) => (
                      <span key={tIdx} className={IDE_TOKEN_CLASSES[tok.type]}>
                        {tok.value}
                      </span>
                    ))
                  )}
                </code>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
