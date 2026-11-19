import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Paperclip,
  ArrowUp,
  Square,
  X,
  FileText,
  FileCode2,
  FileSpreadsheet,
  Image as ImageIcon,
  ImagePlus,
  Video as VideoIcon,
  Loader2,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react';
import { AiModel, ChatAttachment, WorkspaceStudioMode } from '../../types/index.ts';
import {
  ATTACHMENT_DOCUMENT_ACCEPT,
  ATTACHMENT_IMAGE_ACCEPT,
  COMPOSER_MAX_HEIGHT_PX,
  FILE_INPUT_ACCEPT,
  type ParsedDocumentResponse,
  clampComposerHeight,
  formatAttachmentBadgeMeta,
  getAttachmentFileCategory,
  processSelectedFiles,
  requiresServerDocumentParsing,
} from '../../utils/chatAttachments.ts';
import {
  IMAGE_ASPECT_RATIOS,
  type ImageAspectRatio,
} from '../../utils/imageGeneration.ts';
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from '../../utils/videoGeneration.ts';
import { WorkspaceModelIcon } from './WorkspaceModelIcon.tsx';
import { resolveEffectiveModelName } from '../../utils/modelBrandIcons.ts';

interface ChatComposerProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputMessage: string;
  onInputChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAddAttachments: (newAttachments: ChatAttachment[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onParseDocument?: (file: File) => Promise<ParsedDocumentResponse>;
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
  studioMode?: WorkspaceStudioMode;
  onChangeStudioMode?: (mode: WorkspaceStudioMode) => void;
  aspectRatio?: ImageAspectRatio;
  onSelectAspectRatio?: (ratio: ImageAspectRatio) => void;
  isGeneratingImage?: boolean;
  videoAspectRatio?: VideoAspectRatio;
  onSelectVideoAspectRatio?: (ratio: VideoAspectRatio) => void;
  videoDuration?: VideoDuration;
  onSelectVideoDuration?: (duration: VideoDuration) => void;
  videoResolution?: VideoResolution;
  onSelectVideoResolution?: (resolution: VideoResolution) => void;
  isGeneratingVideo?: boolean;
}

function renderAttachmentIcon(att: ChatAttachment): React.ReactNode {
  const category = att.fileType || getAttachmentFileCategory(att.name, att.mimeType);
  if (category === 'code') {
    return <FileCode2 className="w-4 h-4 text-[#444746] dark:text-[#c4c7c5] shrink-0" />;
  }
  if (category === 'csv') {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  }
  if (category === 'pdf') {
    return <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
  }
  if (category === 'docx') {
    return <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-[#444746] dark:text-[#c4c7c5] shrink-0" />;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputRef,
  inputMessage,
  onInputChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onParseDocument,
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
  studioMode = 'chat',
  onChangeStudioMode,
  aspectRatio = '1:1',
  onSelectAspectRatio,
  isGeneratingImage = false,
  videoAspectRatio = '16:9',
  onSelectVideoAspectRatio,
  videoDuration = '5s',
  onSelectVideoDuration,
  videoResolution = '720p',
  onSelectVideoResolution,
  isGeneratingVideo = false,
}) => {
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [toolbarModelOpen, setToolbarModelOpen] = useState(false);
  const [isDraggingComposer, setIsDraggingComposer] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [parsingFileNames, setParsingFileNames] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPickingFileRef = useRef(false);
  const dragCounterRef = useRef(0);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
  const isParsingAttachments = parsingFileNames.length > 0;
  const isImageMode = studioMode === 'image';
  const isVideoMode = studioMode === 'video';
  const isMediaBusy = isGeneratingImage || isGeneratingVideo;

  const handleFilesIntake = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const serverFiles = files
      .filter((f) => requiresServerDocumentParsing(f.name, f.type))
      .map((f) => f.name);

    if (serverFiles.length > 0) {
      setParsingFileNames((prev) => [...prev, ...serverFiles]);
    }

    try {
      const { attachments: parsed, errors } = await processSelectedFiles(
        files,
        attachments.length,
        { parseDocument: onParseDocument }
      );
      if (parsed.length > 0) {
        onAddAttachments(parsed);
      }
      if (errors.length > 0) {
        setAttachmentError(errors[0]);
      }
    } finally {
      if (serverFiles.length > 0) {
        setParsingFileNames((prev) => prev.filter((name) => !serverFiles.includes(name)));
      }
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
    const minHeight = (isImageMode || isVideoMode) && !inputMessage ? 52 : 44;
    const nextHeight = Math.max(minHeight, el.scrollHeight);
    const { heightPx, overflowY } = clampComposerHeight(
      nextHeight,
      COMPOSER_MAX_HEIGHT_PX
    );
    el.style.height = `${heightPx}px`;
    el.style.overflowY = overflowY;
  }, [inputMessage, attachments.length, parsingFileNames.length, isImageMode, isVideoMode]);

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
    setToolbarModelOpen(false);
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

  const handleSelectStudioMode = (nextMode: WorkspaceStudioMode) => {
    setAttachMenuOpen(false);
    setToolbarModelOpen(false);
    if (nextMode !== 'chat' && !isSubscribed) {
      onOpenPaymentModal();
      return;
    }
    onChangeStudioMode?.(nextMode);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const canSend =
    isImageMode || isVideoMode
      ? inputMessage.trim().length > 0 &&
        isSubscribed &&
        !isStreaming &&
        !isMediaBusy &&
        !isParsingAttachments
      : (inputMessage.trim().length > 0 || attachments.length > 0) &&
        isSubscribed &&
        !isStreaming &&
        !isMediaBusy &&
        !isParsingAttachments;

  return (
    <div className="px-3 sm:px-6 pt-1.5 pb-3 sm:pb-4 bg-white dark:bg-[#131314] shrink-0 w-full max-w-full">
      <div className="max-w-[780px] mx-auto w-full min-w-0">
        {attachmentError && (
          <div
            role="alert"
            data-testid="composer-attachment-error"
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
            aria-label="Upload PDF, DOCX, TXT, CSV, code, or image files"
            data-testid="composer-file-input"
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
              if (!isStreaming && !isMediaBusy && !isParsingAttachments) {
                onSubmit();
              }
            }}
            className="w-full"
          >
            {/* Active Image Mode Chip & Aspect Ratio Selector */}
            {isImageMode && (
              <div
                data-testid="image-mode-indicator"
                className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]"
              >
                <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[11.5px] font-medium shadow-xs">
                  <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Create Image</span>
                  {onChangeStudioMode && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectStudioMode('chat')}
                      aria-label="Exit Create Image mode"
                      data-testid="exit-image-mode-btn"
                      className="w-4 h-4 rounded-full hover:bg-white/20 dark:hover:bg-black/15 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {onSelectAspectRatio && (
                  <div
                    role="group"
                    aria-label="Image aspect ratio"
                    className="flex flex-wrap items-center gap-1"
                  >
                    {IMAGE_ASPECT_RATIOS.map((ratioSpec) => {
                      const isSelected = aspectRatio === ratioSpec.id;
                      return (
                        <button
                          key={ratioSpec.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onSelectAspectRatio(ratioSpec.id)}
                          aria-pressed={isSelected}
                          data-testid={`aspect-ratio-${ratioSpec.id}`}
                          className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                              : 'bg-white/60 dark:bg-[#282a2c]/70 text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] border border-black/[0.08] dark:border-white/[0.08]'
                          }`}
                        >
                          {ratioSpec.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active Video Mode Chip & Studio Controls */}
            {isVideoMode && (
              <div
                data-testid="video-mode-indicator"
                className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]"
              >
                <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[11.5px] font-medium shadow-xs">
                  <VideoIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Create Video</span>
                  {onChangeStudioMode && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectStudioMode('chat')}
                      aria-label="Exit Create Video mode"
                      data-testid="exit-video-mode-btn"
                      className="w-4 h-4 rounded-full hover:bg-white/20 dark:hover:bg-black/15 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {onSelectVideoAspectRatio && (
                    <div
                      role="group"
                      aria-label="Video aspect ratio"
                      className="flex items-center gap-1"
                    >
                      {VIDEO_ASPECT_RATIOS.map((ratioSpec) => {
                        const isSelected = videoAspectRatio === ratioSpec.id;
                        return (
                          <button
                            key={ratioSpec.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelectVideoAspectRatio(ratioSpec.id)}
                            aria-pressed={isSelected}
                            data-testid={`video-aspect-ratio-${ratioSpec.id}`}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                                : 'bg-white/60 dark:bg-[#282a2c]/70 text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] border border-black/[0.08] dark:border-white/[0.08]'
                            }`}
                          >
                            {ratioSpec.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {onSelectVideoDuration && (
                    <div
                      role="group"
                      aria-label="Video duration"
                      className="flex items-center gap-1"
                    >
                      {VIDEO_DURATIONS.map((durSpec) => {
                        const isSelected = videoDuration === durSpec.id;
                        return (
                          <button
                            key={durSpec.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelectVideoDuration(durSpec.id)}
                            aria-pressed={isSelected}
                            data-testid={`video-duration-${durSpec.id}`}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                                : 'bg-white/60 dark:bg-[#282a2c]/70 text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] border border-black/[0.08] dark:border-white/[0.08]'
                            }`}
                          >
                            {durSpec.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {onSelectVideoResolution && (
                    <div
                      role="group"
                      aria-label="Video resolution"
                      className="flex items-center gap-1"
                    >
                      {VIDEO_RESOLUTIONS.map((resSpec) => {
                        const isSelected = videoResolution === resSpec.id;
                        return (
                          <button
                            key={resSpec.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelectVideoResolution(resSpec.id)}
                            aria-pressed={isSelected}
                            data-testid={`video-resolution-${resSpec.id}`}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                                : 'bg-white/60 dark:bg-[#282a2c]/70 text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] border border-black/[0.08] dark:border-white/[0.08]'
                            }`}
                          >
                            {resSpec.id}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pre-send Attachment Preview Badges */}
            {(attachments.length > 0 || parsingFileNames.length > 0) && (
              <div
                data-testid="composer-attachment-previews"
                className="flex flex-wrap items-center gap-2 pb-2.5 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]"
              >
                {attachments.map((att) =>
                  att.kind === 'image' && att.dataUrl ? (
                    <div
                      key={att.id}
                      data-testid="attachment-preview-image"
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
                      data-testid="attachment-preview-doc"
                      className="flex items-center gap-2 max-w-[240px] pl-2.5 pr-1.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/85 dark:bg-[#282a2c] text-xs"
                    >
                      {renderAttachmentIcon(att)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate text-[11.5px]">
                          {att.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] truncate">
                          {formatAttachmentBadgeMeta(att)}
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

                {parsingFileNames.map((fileName, idx) => (
                  <div
                    key={`${fileName}-${idx}`}
                    data-testid="attachment-parsing-badge"
                    className="flex items-center gap-2 max-w-[220px] px-2.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/70 dark:bg-[#282a2c]/80 text-xs"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#444746] dark:text-[#c4c7c5] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate text-[11.5px]">
                        {fileName}
                      </div>
                      <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                        Parsing document...
                      </div>
                    </div>
                  </div>
                ))}
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
                  if (!isStreaming && !isMediaBusy && !isParsingAttachments) {
                    onSubmit();
                  }
                }
              }}
              placeholder={
                !isSubscribed
                  ? 'Activate a subscription plan to chat...'
                  : isImageMode
                    ? 'Describe the image you want to create...'
                    : isVideoMode
                      ? 'Describe the short video scene you want to generate...'
                      : 'Ask Bangla-AI.pro or attach files...'
              }
              disabled={!isSubscribed}
              className="w-full min-w-0 resize-none bg-transparent px-1.5 py-0.5 text-[15px] leading-[1.6] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder-[#444746]/75 dark:placeholder-[#9aa0a6]/80 focus:outline-none disabled:opacity-50 max-h-[180px]"
            />

            {/* Unified Bottom Toolbar Row Inside Pill */}
            <div
              data-testid="composer-bottom-toolbar"
              className="mt-2 pt-1 flex items-center justify-between gap-2"
            >
              {/* Left Controls: + Menu & Quick Paperclip Upload */}
              <div className="relative flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setToolbarModelOpen(false);
                    setAttachMenuOpen((prev) => !prev);
                  }}
                  aria-label="Open tools and upload menu"
                  aria-expanded={attachMenuOpen}
                  data-testid="toolbar-attach-btn"
                  title="Add files, create image, or create video"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    attachMenuOpen
                      ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  <Plus className={`w-[18px] h-[18px] transition-transform duration-150 ${attachMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openFilePicker(FILE_INPUT_ACCEPT)}
                  aria-label="Attach PDF, DOCX, TXT, CSV, or images"
                  data-testid="toolbar-paperclip-btn"
                  title="Attach PDF, DOCX, TXT, CSV, or images"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition-colors cursor-pointer shrink-0"
                >
                  <Paperclip className="w-[17px] h-[17px]" />
                </button>

                {attachMenuOpen && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] shadow-xl py-1.5 z-50 text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => openFilePicker(ATTACHMENT_IMAGE_ACCEPT)}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
                      <span>Upload image (JPG, PNG, WEBP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openFilePicker(ATTACHMENT_DOCUMENT_ACCEPT)}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
                      <span>Attach PDF, DOCX, TXT, CSV</span>
                    </button>
                    {onChangeStudioMode && (
                      <>
                        <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />
                        <button
                          type="button"
                          onClick={() => handleSelectStudioMode('image')}
                          data-testid="menu-create-image-btn"
                          className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isImageMode
                              ? 'bg-[#e9eef6]/70 dark:bg-white/[0.08] font-medium text-[#1f1f1f] dark:text-[#e3e3e3]'
                              : 'text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <ImagePlus className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
                            <span>Create Image</span>
                          </span>
                          {isImageMode && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStudioMode('video')}
                          data-testid="menu-create-video-btn"
                          className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isVideoMode
                              ? 'bg-[#e9eef6]/70 dark:bg-white/[0.08] font-medium text-[#1f1f1f] dark:text-[#e3e3e3]'
                              : 'text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <VideoIcon className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
                            <span>Create Video</span>
                          </span>
                          {isVideoMode && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      </>
                    )}
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
                    aria-label={`Switch model (${selectedModel ? resolveEffectiveModelName(selectedModel) : 'Select Model'})`}
                    aria-expanded={toolbarModelOpen}
                    data-testid="toolbar-model-btn"
                    className="h-8 max-w-[175px] sm:max-w-[235px] px-2.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-[12px] font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <WorkspaceModelIcon model={selectedModel} sizeClass="w-3.5 h-3.5" />
                    <span className="truncate">{selectedModel ? resolveEffectiveModelName(selectedModel) : 'Select Model'}</span>
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
                              <span className="truncate">{resolveEffectiveModelName(m)}</span>
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
                    aria-label={
                      isImageMode
                        ? 'Generate image'
                        : isVideoMode
                          ? 'Generate video'
                          : 'Send message'
                    }
                    data-testid="send-message-btn"
                    className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] flex items-center justify-center disabled:opacity-25 transition-all shrink-0 cursor-pointer"
                  >
                    {isMediaBusy || isParsingAttachments ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4 stroke-[2.2]" />
                    )}
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
