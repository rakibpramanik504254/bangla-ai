import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Send,
  Square,
  X,
  FileText,
  FileCode2,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';
import { AiModel, ChatAttachment } from '../../types/index.ts';
import {
  COMPOSER_MAX_HEIGHT_PX,
  FILE_INPUT_ACCEPT,
  clampComposerHeight,
  formatFileSize,
  processSelectedFiles,
  shouldComposerExpand
} from '../../utils/chatAttachments.ts';

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
  onClearExternalDroppedFiles
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [toolbarModelOpen, setToolbarModelOpen] = useState(false);
  const [isDraggingComposer, setIsDraggingComposer] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPickingFileRef = useRef(false);
  const dragCounterRef = useRef(0);

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];
  const isExpanded = shouldComposerExpand({
    isFocused,
    inputValue: inputMessage,
    attachmentCount: attachments.length,
    isToolbarMenuOpen: toolbarModelOpen
  });

  const handleFilesIntake = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);
    const { attachments: parsed, errors } = await processSelectedFiles(files, attachments.length);
    if (parsed.length > 0) {
      onAddAttachments(parsed);
      setIsFocused(true);
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

  // Auto-resize textarea smoothly up to 180px when expanded; single-row compact when collapsed
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    if (!isExpanded) {
      el.style.height = '36px';
      el.style.overflowY = 'hidden';
      return;
    }

    el.style.height = 'auto';
    const nextHeight = Math.max(48, el.scrollHeight);
    const { heightPx, overflowY } = clampComposerHeight(nextHeight, COMPOSER_MAX_HEIGHT_PX);
    el.style.height = `${heightPx}px`;
    el.style.overflowY = overflowY;
  }, [inputMessage, isExpanded, attachments.length]);

  // Close toolbar model dropdown on outside click
  useEffect(() => {
    if (!toolbarModelOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbarModelOpen(false);
        if (!inputMessage.trim() && attachments.length === 0) {
          setIsFocused(false);
        }
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [toolbarModelOpen, inputMessage, attachments.length]);

  const handleContainerFocus = () => {
    setIsFocused(true);
  };

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (isPickingFileRef.current) return;
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return;
    }
    if (!inputMessage.trim() && attachments.length === 0 && !toolbarModelOpen) {
      setIsFocused(false);
    }
  };

  const openFilePicker = (acceptOverride?: string) => {
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

  const canSend = (inputMessage.trim().length > 0 || attachments.length > 0) && isSubscribed && !isStreaming;

  return (
    <div className="p-2.5 sm:p-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1F1F1F] shrink-0 w-full max-w-full">
      <div className="max-w-4xl mx-auto w-full min-w-0">
        {attachmentError && (
          <div
            role="alert"
            className="mb-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{attachmentError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentError(null)}
              aria-label="Dismiss attachment error"
              className="p-0.5 rounded hover:bg-rose-200/50 dark:hover:bg-rose-800/40 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          data-testid="chat-composer"
          data-expanded={isExpanded ? 'true' : 'false'}
          onFocusCapture={handleContainerFocus}
          onBlurCapture={handleContainerBlur}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border transition-all duration-200 ease-out shadow-xs ${
            toolbarModelOpen ? 'overflow-visible' : 'overflow-hidden'
          } ${
            isDraggingComposer
              ? 'rounded-[20px] border-black dark:border-white ring-2 ring-black/15 dark:ring-white/20 bg-black/[0.02] dark:bg-white/[0.04]'
              : isExpanded
                ? 'rounded-[20px] border-black/80 dark:border-white/80 bg-white dark:bg-[#262626] px-3 pt-2.5 pb-2'
                : 'rounded-[26px] border-black/[0.14] dark:border-white/[0.16] hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#262626] px-2 py-1.5'
          }`}
        >
          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            aria-label="Upload photos or files"
            className="hidden"
            onChange={e => {
              isPickingFileRef.current = false;
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleFilesIntake(files);
              }
              e.target.value = '';
            }}
          />

          <form
            onSubmit={e => {
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
                className="flex flex-wrap items-center gap-2 pb-2.5 mb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]"
              >
                {attachments.map(att =>
                  att.kind === 'image' && att.dataUrl ? (
                    <div
                      key={att.id}
                      className="group relative w-16 h-16 rounded-[10px] overflow-hidden border border-black/[0.1] dark:border-white/[0.15] bg-black/[0.03] dark:bg-white/[0.05] shrink-0"
                    >
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
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
                      className="flex items-center gap-2 max-w-[220px] pl-2.5 pr-1.5 py-1.5 rounded-[10px] border border-black/[0.1] dark:border-white/[0.14] bg-black/[0.03] dark:bg-white/[0.05] text-xs"
                    >
                      {isCodeFileName(att.name) ? (
                        <FileCode2 className="w-4 h-4 text-gray-700 dark:text-gray-200 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-700 dark:text-gray-200 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-black dark:text-white truncate text-[11.5px]">
                          {att.name}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          {formatFileSize(att.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => onRemoveAttachment(att.id)}
                        aria-label={`Remove ${att.name}`}
                        className="w-5 h-5 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-gray-500 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Main Input Row: Side Quick Actions (Collapsed) + Full-Width Expanding Textarea */}
            <div className="flex items-center w-full min-w-0">
              {/* Outer Left Quick Action Buttons (Smoothly collapse/slide away when focused) */}
              <div
                aria-hidden={isExpanded}
                className={`flex items-center gap-1 shrink-0 overflow-hidden transition-all duration-200 ease-out ${
                  isExpanded
                    ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none mr-0'
                    : 'max-w-[92px] opacity-100 translate-x-0 mr-1.5'
                }`}
              >
                <button
                  type="button"
                  tabIndex={isExpanded ? -1 : 0}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => openFilePicker(FILE_INPUT_ACCEPT)}
                  aria-label="Attach file"
                  title="Attach photo or file"
                  className="w-9 h-9 rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  tabIndex={isExpanded ? -1 : 0}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => openFilePicker('image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp')}
                  aria-label="Upload photo"
                  title="Upload photo (PNG, JPG, WEBP)"
                  className="w-9 h-9 rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Center Textarea — Expands to 100% width on focus */}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputMessage}
                onChange={e => onInputChange(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isStreaming) {
                      onSubmit();
                    }
                  }
                }}
                placeholder={
                  isSubscribed
                    ? `Message ${selectedModel?.display_name || 'Bangla AI'}...`
                    : 'Activate a subscription plan to chat...'
                }
                disabled={!isSubscribed}
                className={`w-full flex-1 min-w-0 resize-none bg-transparent text-[15px] sm:text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 transition-all duration-200 ${
                  isExpanded
                    ? 'px-1 py-1 leading-relaxed max-h-[180px]'
                    : 'px-2 py-1.5 leading-6 h-9 overflow-hidden'
                }`}
              />

              {/* Outer Right Compact Send / Stop Button (Smoothly hides when expanded to move into bottom toolbar) */}
              <div
                aria-hidden={isExpanded}
                className={`flex items-center gap-1 shrink-0 overflow-hidden transition-all duration-200 ease-out ${
                  isExpanded
                    ? 'max-w-0 opacity-0 translate-x-2 pointer-events-none ml-0'
                    : 'max-w-[48px] opacity-100 translate-x-0 ml-1.5'
                }`}
              >
                {isStreaming ? (
                  <button
                    type="button"
                    tabIndex={isExpanded ? -1 : 0}
                    onMouseDown={e => e.preventDefault()}
                    onClick={onStopGeneration}
                    aria-label="Stop generation"
                    data-testid="stop-generation-btn-collapsed"
                    title="Stop generation"
                    className="w-9 h-9 rounded-[10px] bg-black hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    tabIndex={isExpanded ? -1 : 0}
                    disabled={!canSend}
                    aria-label="Send message"
                    className="w-9 h-9 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black flex items-center justify-center disabled:opacity-25 transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Toolbar Row (Visible when Focused / Active) */}
            <div
              data-testid="composer-bottom-toolbar"
              className={`grid transition-all duration-200 ease-out ${
                isExpanded
                  ? 'grid-rows-[1fr] opacity-100 mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className={toolbarModelOpen ? 'overflow-visible' : 'overflow-hidden'}>
                <div className="flex items-center justify-between gap-2">
                  {/* Left Toolbar Controls: Paperclip + Model Selector */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      tabIndex={isExpanded ? 0 : -1}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => openFilePicker(FILE_INPUT_ACCEPT)}
                      aria-label="Attach photos or files"
                      data-testid="toolbar-attach-btn"
                      className="h-8 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.14] hover:border-black/30 dark:hover:border-white/30 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">Attach</span>
                    </button>

                    {/* Inline Model Selector Pill */}
                    <div className="relative min-w-0">
                      <button
                        type="button"
                        tabIndex={isExpanded ? 0 : -1}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setToolbarModelOpen(prev => !prev)}
                        aria-label={`Switch model (${selectedModel?.display_name || 'Select Model'})`}
                        aria-expanded={toolbarModelOpen}
                        data-testid="toolbar-model-btn"
                        className="h-8 max-w-[190px] sm:max-w-[260px] px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.14] hover:border-black/30 dark:hover:border-white/30 bg-black/[0.02] dark:bg-white/[0.04] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate">{selectedModel?.display_name || 'Select Model'}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                      </button>

                      {toolbarModelOpen && (
                        <div
                          onMouseDown={e => e.preventDefault()}
                          className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-[12px] bg-white dark:bg-[#262626] border border-black/[0.12] dark:border-white/[0.15] shadow-xl py-1.5 z-50 text-xs"
                        >
                          <div className="px-3 py-1 text-[10px] uppercase font-mono text-gray-400 border-b border-black/[0.06] dark:border-white/[0.06]">
                            Select Model
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {models.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  onSelectModel(m.id);
                                  setToolbarModelOpen(false);
                                  inputRef.current?.focus();
                                }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                                  selectedModelId === m.id
                                    ? 'bg-black/[0.04] dark:bg-white/[0.08] font-semibold text-black dark:text-white'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <span className="truncate">{m.display_name}</span>
                                {selectedModelId === m.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Toolbar Controls: Hint + Send/Stop Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline text-[11px] font-mono text-gray-400">
                      Paste or drop files
                    </span>
                    {isStreaming ? (
                      <button
                        type="button"
                        tabIndex={isExpanded ? 0 : -1}
                        onMouseDown={e => e.preventDefault()}
                        onClick={onStopGeneration}
                        aria-label="Stop generation"
                        data-testid="stop-generation-btn"
                        title="Stop generation"
                        className="w-9 h-9 rounded-[10px] bg-black hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black flex items-center justify-center transition-all shrink-0 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        tabIndex={isExpanded ? 0 : -1}
                        disabled={!canSend}
                        onMouseDown={e => e.preventDefault()}
                        aria-label="Send message"
                        data-testid="send-message-btn"
                        className="w-9 h-9 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black flex items-center justify-center disabled:opacity-25 transition-all shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="hidden sm:flex items-center justify-between gap-2 text-[11px] text-gray-500 px-2 mt-1.5 font-mono">
          <span>Enter to send • Shift+Enter for new line • Drag &amp; drop or Ctrl+V to attach</span>
          <span className="truncate max-w-xs">{selectedModel?.display_name}</span>
        </div>
      </div>
    </div>
  );
};
