import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Paperclip,
  ArrowUp,
  Square,
  X,
  FileText,
  FileCode2,
  Image as ImageIcon,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react';
import { AiModel, ChatAttachment } from '../../types/index.ts';
import {
  COMPOSER_MAX_HEIGHT_PX,
  FILE_INPUT_ACCEPT,
  clampComposerHeight,
  formatFileSize,
  processSelectedFiles,
} from '../../utils/chatAttachments.ts';
import { WorkspaceModelIcon } from './WorkspaceModelIcon.tsx';

interface ChatComposerProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputMessage: string;
  onInputChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAddAttachments: (newAttachments: ChatAttachment[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit: () => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  isSubscribed: boolean;
  models: AiModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onOpenPaymentModal: () => void;
  externalDroppedFiles?: File[] | null;
  onClearExternalDroppedFiles?: () => void;
}

const CODE_EXTENSIONS = new Set(['.js', '.ts', '.py', '.html', '.css', '.json']);

function isCodeFileName(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of CODE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputRef,
  inputMessage,
  onInputChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onSubmit,
  onStopGeneration,
  isStreaming,
  isSubscribed,
  models,
  selectedModelId,
  onSelectModel,
  onOpenPaymentModal,
  externalDroppedFiles,
  onClearExternalDroppedFiles,
}) => {
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [toolbarModelOpen, setToolbarModelOpen] = useState(false);
  const [isDraggingComposer, setIsDraggingComposer] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPickingFileRef = useRef(false);
  const dragCounterRef = useRef(0);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleFilesIntake = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);
    const { attachments: parsed, errors } = await processSelectedFiles(
      files,
      attachments.length
    );
    if (parsed.length > 0) {
      onAddAttachments(parsed);
    }
    if (errors.length > 0) {
      setAttachmentError(errors[0]);
    }
  };

  useEffect(() => {
    if (externalDroppedFiles && externalDroppedFiles.length > 0) {
      handleFilesIntake(externalDroppedFiles);
      onClearExternalDroppedFiles?.();
    }
  }, [externalDroppedFiles]);

  // Auto-resize textarea smoothly up to 180px
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const nextHeight = Math.max(44, el.scrollHeight);
    const { heightPx, overflowY } = clampComposerHeight(
      nextHeight,
      COMPOSER_MAX_HEIGHT_PX
    );
    el.style.height = `${heightPx}px`;
    el.style.overflowY = overflowY;
  }, [inputMessage, attachments.length]);

  // Close popovers on outside click
  useEffect(() => {
    if (!toolbarModelOpen && !attachMenuOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbarModelOpen(false);
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [toolbarModelOpen, attachMenuOpen]);

  const openFilePicker = (acceptOverride?: string) => {
    setAttachMenuOpen(false);
    if (!isSubscribed) {
      onOpenPaymentModal();
      return;
    }
    if (!fileInputRef.current) return;
    isPickingFileRef.current = true;
    fileInputRef.current.accept = acceptOverride || FILE_INPUT_ACCEPT;
    fileInputRef.current.click();
    const clearFlag = () => {
      setTimeout(() => {
        isPickingFileRef.current = false;
      }, 200);
      window.removeEventListener('focus', clearFlag);
    };
    window.addEventListener('focus', clearFlag);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const pastedFiles: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFilesIntake(pastedFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingComposer(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingComposer(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingComposer(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length > 0) {
      handleFilesIntake(dropped);
    }
  };

  const canSend =
    (inputMessage.trim().length > 0 || attachments.length > 0) &&
    isSubscribed &&
    !isStreaming;

  return (
    <div className="px-3 sm:px-6 pt-2 pb-3 sm:pb-4 bg-white dark:bg-[#131314] shrink-0 w-full max-w-full">
      <div className="max-w-[780px] mx-auto w-full min-w-0">
        {attachmentError && (
          <div
            role="alert"
            className="mb-2.5 flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{attachmentError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentError(null)}
              aria-label="Dismiss attachment error"
              className="p-0.5 rounded-full hover:bg-rose-200/50 dark:hover:bg-rose-800/40 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          data-testid="chat-composer"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-[28px] transition-all duration-200 border ${
            isDraggingComposer
              ? 'border-[#1f1f1f] dark:border-[#e3e3e3] ring-2 ring-black/10 dark:ring-white/15 bg-[#e9eef6] dark:bg-[#282a2c]'
              : 'border-black/[0.08] dark:border-white/[0.08] focus-within:border-black/20 dark:focus-within:border-white/20 bg-[#f0f4f9] dark:bg-[#1e1f20] shadow-xs'
          } px-3.5 pt-3 pb-2.5`}
        >
          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            aria-label="Upload photos or files"
            className="hidden"
            onChange={(e) => {
              isPickingFileRef.current = false;
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleFilesIntake(files);
              }
              e.target.value = '';
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isStreaming) {
                onSubmit();
              }
            }}
            className="w-full"
          >
            {/* Pre-send Attachment Previews */}
            {attachments.length > 0 && (
              <div
                data-testid="composer-attachment-previews"
                className="flex flex-wrap items-center gap-2 pb-2.5 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]"
              >
                {attachments.map((att) =>
                  att.kind === 'image' && att.dataUrl ? (
                    <div
                      key={att.id}
                      className="group relative w-16 h-16 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#131314] shrink-0"
                    >
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onRemoveAttachment(att.id)}
                        aria-label={`Remove ${att.name}`}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-opacity cursor-pointer shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 max-w-[220px] pl-2.5 pr-1.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-[#282a2c] text-xs"
                    >
                      {isCodeFileName(att.name) ? (
                        <FileCode2 className="w-4 h-4 text-[#444746] dark:text-[#c4c7c5] shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#444746] dark:text-[#c4c7c5] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate text-[11.5px]">
                          {att.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                          {formatFileSize(att.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onRemoveAttachment(att.id)}
                        aria-label={`Remove ${att.name}`}
                        className="w-5 h-5 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) {
                    onSubmit();
                  }
                }
              }}
              placeholder={
                isSubscribed
                  ? 'Ask Bangla-AI.pro...'
                  : 'Activate a subscription plan to chat...'
              }
              disabled={!isSubscribed}
              className="w-full min-w-0 resize-none bg-transparent px-1.5 py-0.5 text-[15px] leading-[1.6] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder-[#444746]/75 dark:placeholder-[#9aa0a6]/80 focus:outline-none disabled:opacity-50 max-h-[180px]"
            />

            {/* Unified Bottom Toolbar Row Inside Pill */}
            <div
              data-testid="composer-bottom-toolbar"
              className="mt-2 pt-1 flex items-center justify-between gap-2"
            >
              {/* Left Controls: + Attach Menu */}
              <div className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setToolbarModelOpen(false);
                    setAttachMenuOpen((prev) => !prev);
                  }}
                  aria-label="Attach photos or files"
                  aria-expanded={attachMenuOpen}
                  data-testid="toolbar-attach-btn"
                  title="Add photos or files"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    attachMenuOpen
                      ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  <Plus className={`w-[18px] h-[18px] transition-transform duration-150 ${attachMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                {attachMenuOpen && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] shadow-xl py-1.5 z-50 text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openFilePicker('image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp')
                      }
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
                      <span>Upload image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openFilePicker(FILE_INPUT_ACCEPT)}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
                      <span>Attach file or code</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Controls: Compact Model Selector Pill + Send/Stop */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative min-w-0">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setAttachMenuOpen(false);
                      setToolbarModelOpen((prev) => !prev);
                    }}
                    aria-label={`Switch model (${selectedModel?.display_name || 'Select Model'})`}
                    aria-expanded={toolbarModelOpen}
                    data-testid="toolbar-model-btn"
                    className="h-8 max-w-[175px] sm:max-w-[235px] px-2.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-[12px] font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <WorkspaceModelIcon model={selectedModel} sizeClass="w-3.5 h-3.5" />
                    <span className="truncate">{selectedModel?.display_name || 'Select Model'}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  </button>

                  {toolbarModelOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] shadow-xl py-1.5 z-50 text-xs"
                    >
                      <div className="px-3.5 py-1.5 text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] border-b border-black/[0.06] dark:border-white/[0.08]">
                        Switch model
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSelectModel(m.id);
                              setToolbarModelOpen(false);
                              inputRef.current?.focus();
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                              selectedModelId === m.id
                                ? 'bg-[#e9eef6]/70 dark:bg-white/[0.08] font-medium text-[#1f1f1f] dark:text-[#e3e3e3]'
                                : 'text-[#444746] dark:text-[#c4c7c5]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <WorkspaceModelIcon model={m} sizeClass="w-4 h-4" />
                              <span className="truncate">{m.display_name}</span>
                            </div>
                            {selectedModelId === m.id && (
                              <Check className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isStreaming ? (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onStopGeneration}
                    aria-label="Stop generation"
                    data-testid="stop-generation-btn"
                    title="Stop generation"
                    className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSend}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label="Send message"
                    data-testid="send-message-btn"
                    className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] flex items-center justify-center disabled:opacity-25 transition-all shrink-0 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.2]" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <p className="text-[11px] text-[#444746]/75 dark:text-[#9aa0a6]/80 text-center mt-2 select-none">
          Bangla-AI.pro can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};
