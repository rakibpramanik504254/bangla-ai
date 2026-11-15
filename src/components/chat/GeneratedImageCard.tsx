import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { AiModel, ChatAttachment } from '../../types/index.ts';
import {
  buildImageFilename,
  getAspectRatioSpec,
  type ImageAspectRatio,
} from '../../utils/imageGeneration.ts';
import { WorkspaceModelIcon } from './WorkspaceModelIcon.tsx';
import { resolveEffectiveModelName } from '../../utils/modelBrandIcons.ts';

interface GeneratedImageCardProps {
  attachment: ChatAttachment;
  authToken: string | null;
  isBusy?: boolean;
  isRegeneratingThis?: boolean;
  onRegenerate: (attachment: ChatAttachment) => void;
}

export const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({
  attachment,
  authToken,
  isBusy = false,
  isRegeneratingThis = false,
  onRegenerate,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const ratioSpec = getAspectRatioSpec(attachment.aspectRatio);
  const displaySrc = attachment.dataUrl || attachment.imageUrl || '';
  const promptLabel = attachment.prompt || attachment.enhancedPrompt || 'AI Generated Artwork';
  const filename =
    attachment.name || buildImageFilename(promptLabel, ratioSpec.id);

  const handleDownloadHd = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      let blob: Blob | null = null;

      if (attachment.dataUrl && attachment.dataUrl.startsWith('data:image/')) {
        const res = await fetch(attachment.dataUrl);
        blob = await res.blob();
      } else if (attachment.imageUrl) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(
          attachment.imageUrl
        )}&download=1&filename=${encodeURIComponent(filename)}`;
        const res = await fetch(proxyUrl, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Could not fetch HD image for download.');
        }
        blob = await res.blob();
      }

      if (!blob) {
        throw new Error('Image source is unavailable.');
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setDownloadError(err?.message || 'Download failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      data-testid="generated-image-card"
      className={`w-full ${ratioSpec.frameClass} rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9]/80 dark:bg-[#1e1f20]/90 backdrop-blur-md shadow-sm overflow-hidden transition-all`}
    >
      {/* Aspect-ratio image frame */}
      <div
        className={`relative w-full overflow-hidden bg-[#e9eef6] dark:bg-[#131314] ${ratioSpec.aspectClass}`}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#444746] dark:text-[#9aa0a6] animate-pulse">
            <ImageIcon className="w-7 h-7 opacity-60" />
            <span className="text-xs font-medium">Loading HD image...</span>
          </div>
        )}

        {imageError || !displaySrc ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-5 text-center">
            <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-[260px]">
              Could not render the remote image preview. Click Regenerate to create a fresh render.
            </p>
            <button
              type="button"
              onClick={() => onRegenerate(attachment)}
              disabled={isBusy}
              className="h-8 px-3.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-xs font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          </div>
        ) : (
          <img
            src={displaySrc}
            alt={promptLabel}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Top-left Ratio & Resolution Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[10.5px] font-mono font-medium">
            {ratioSpec.id}
          </span>
          {attachment.width && attachment.height && (
            <span className="px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white/90 text-[10.5px] font-mono">
              {attachment.width}×{attachment.height}
            </span>
          )}
        </div>
      </div>

      {/* Glassmorphic Caption & Action Footer */}
      <div className="p-3.5 space-y-2.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/65 dark:bg-[#282a2c]/65 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Prompt</span>
            {attachment.provider && (
              <span className="ml-auto font-mono text-[10px] uppercase opacity-75">
                {attachment.provider}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[#1f1f1f] dark:text-[#e3e3e3] line-clamp-2 leading-relaxed">
            {attachment.enhancedPrompt || promptLabel}
          </p>
        </div>

        {downloadError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400">{downloadError}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleDownloadHd}
            disabled={isDownloading || !displaySrc}
            data-testid="download-hd-image-btn"
            aria-label="Download HD Image"
            className="h-8 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download HD Image</span>
          </button>

          <button
            type="button"
            onClick={() => onRegenerate(attachment)}
            disabled={isBusy}
            data-testid="regenerate-image-btn"
            aria-label="Regenerate image"
            className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white/80 dark:bg-[#1e1f20] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegeneratingThis ? 'animate-spin' : ''}`}
            />
            <span>{isRegeneratingThis ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GeneratingImageSkeletonProps {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  model?: AiModel;
}

export const GeneratingImageSkeleton: React.FC<GeneratingImageSkeletonProps> = ({
  prompt,
  aspectRatio,
  model,
}) => {
  const ratioSpec = getAspectRatioSpec(aspectRatio);

  return (
    <div
      data-testid="generating-image-skeleton"
      className="flex gap-3 sm:gap-3.5 justify-start w-full min-w-0 animate-in fade-in"
    >
      <div className="w-7 h-7 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
        <WorkspaceModelIcon model={model} sizeClass="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#444746] dark:text-[#9aa0a6]">
          <span>{model ? resolveEffectiveModelName(model) : 'Bangla AI Studio'}</span>
          <span className="text-[11px] opacity-75">· Image Studio</span>
        </div>

        <div
          className={`w-full ${ratioSpec.frameClass} rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9]/85 dark:bg-[#1e1f20]/90 overflow-hidden`}
        >
          <div
            className={`relative w-full bg-[#e9eef6] dark:bg-[#282a2c]/60 flex flex-col items-center justify-center gap-3 p-6 text-center ${ratioSpec.aspectClass}`}
          >
            <div className="w-11 h-11 rounded-full bg-white/80 dark:bg-[#131314]/80 border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center shadow-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[#1f1f1f] dark:text-[#e3e3e3]" />
            </div>
            <div className="space-y-1 max-w-[260px]">
              <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Creating {ratioSpec.label} image...
              </p>
              <p className="text-[11.5px] text-[#444746] dark:text-[#9aa0a6] line-clamp-2">
                {prompt}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
