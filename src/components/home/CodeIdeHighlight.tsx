import React from 'react';
import { tokenizeCodeLine, TokenType } from '../../utils/syntaxHighlight.ts';

interface CodeIdeHighlightProps {
  code: string;
  filename?: string;
  languageLabel?: string;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: 'text-[#C678DD] font-medium',
  string: 'text-[#98C379]',
  comment: 'text-[#7F848E] italic',
  function: 'text-[#61AFEF]',
  type: 'text-[#E5C07B]',
  number: 'text-[#D19A66]',
  operator: 'text-[#56B6C2]',
  punctuation: 'text-[#848B98]',
  plain: 'text-[#E4E7EF]'
};

export const CodeIdeHighlight: React.FC<CodeIdeHighlightProps> = ({
  code,
  filename = 'useDebouncedSearch.ts',
  languageLabel = 'TypeScript'
}) => {
  const lines = code.split('\n');

  return (
    <div className="rounded-[10px] overflow-hidden border border-black/15 dark:border-white/10 bg-[#181A20] text-[#E4E7EF] shadow-sm min-w-0 max-w-full">
      {/* IDE Window Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#21242D] border-b border-white/[0.07] text-[11px] font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>
          <span className="text-gray-300 truncate font-medium">{filename}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-[#61AFEF] shrink-0">
          {languageLabel}
        </span>
      </div>

      {/* Syntax-Highlighted Code Lines */}
      <div className="p-3 sm:p-4 font-mono text-[11.5px] sm:text-xs leading-relaxed overflow-x-auto max-w-full">
        <div className="space-y-0.5 min-w-0">
          {lines.map((line, lineIdx) => {
            const tokens = tokenizeCodeLine(line);
            return (
              <div key={lineIdx} className="flex items-start gap-3 min-w-0">
                <span className="select-none text-[#4B5263] text-[10.5px] w-5 text-right shrink-0 pt-[1px]">
                  {lineIdx + 1}
                </span>
                <code className="flex-1 min-w-0 whitespace-pre-wrap break-words">
                  {tokens.length === 0 ? (
                    ' '
                  ) : (
                    tokens.map((tok, tIdx) => (
                      <span key={tIdx} className={TOKEN_CLASSES[tok.type]}>
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
