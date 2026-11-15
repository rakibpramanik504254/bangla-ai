import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Edit,
  Check,
  X,
  RotateCcw,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import { AiModel } from '../../types/index.ts';
import {
  AI_BRAND_LOGOS,
  type BrandIconKey,
  normalizeBrandIconKey,
  resolveEffectiveModelIcon,
  resolveEffectiveModelName,
  resolveEffectiveModelDescription,
  isModelCustomized
} from '../../utils/modelBrandIcons.ts';
import { BrandLogoIcon } from '../chat/BrandLogoIcon.tsx';
import { WorkspaceModelIcon } from '../chat/WorkspaceModelIcon.tsx';

interface ModelsCatalogTabProps {
  token: string | null;
  models: AiModel[];
  setModels: React.Dispatch<React.SetStateAction<AiModel[]>>;
  onRefreshModels: () => Promise<void> | void;
  setFeedback: (msg: string | null) => void;
}

export const ModelsCatalogTab: React.FC<ModelsCatalogTabProps> = ({
  token,
  models,
  setModels,
  onRefreshModels,
  setFeedback
}) => {
  const [modelFilter, setModelFilter] = useState<'all' | 'flagship' | 'free'>('all');
  const [syncingFreeModels, setSyncingFreeModels] = useState(false);

  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [editingModelDescription, setEditingModelDescription] = useState('');
  const [savingModelId, setSavingModelId] = useState<string | null>(null);

  const [draggingBrandKey, setDraggingBrandKey] = useState<BrandIconKey | null>(null);
  const [dragOverModelId, setDragOverModelId] = useState<string | null>(null);
  const [iconPickerModelId, setIconPickerModelId] = useState<string | null>(null);

  const [resettingModelId, setResettingModelId] = useState<string | null>(null);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  const pickerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!iconPickerModelId) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(e.target as Node)
      ) {
        setIconPickerModelId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIconPickerModelId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [iconPickerModelId]);

  const broadcastModelsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bangla-ai:models-updated'));
    }
  };

  const isFreeModel = (m: AiModel) =>
    Boolean(
      m.is_free ||
        m.badge === 'free' ||
        m.model_name.endsWith(':free') ||
        m.model_name === 'openrouter/free'
    );

  const freeModelsList = models.filter(isFreeModel);
  const freeOnCount = freeModelsList.filter(m => m.is_enabled).length;
  const flagshipModelsList = models.filter(m => !isFreeModel(m));
  const customizedCount = models.filter(m => isModelCustomized(m)).length;

  const visibleModels =
    modelFilter === 'free'
      ? freeModelsList
      : modelFilter === 'flagship'
      ? flagshipModelsList
      : models;

  const handleToggleModel = async (model: AiModel) => {
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_enabled: !model.is_enabled
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setModels(prev => prev.map(m => (m.id === model.id ? updated : m)));
        broadcastModelsUpdated();
        setFeedback(
          `Model ${resolveEffectiveModelName(model)} is now ${
            !model.is_enabled ? 'enabled' : 'disabled'
          }.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartModelEdit = (model: AiModel) => {
    setIconPickerModelId(null);
    setEditingModelId(model.id);
    setEditingModelName(resolveEffectiveModelName(model));
    setEditingModelDescription(resolveEffectiveModelDescription(model));
  };

  const handleCancelModelEdit = () => {
    setEditingModelId(null);
    setEditingModelName('');
    setEditingModelDescription('');
  };

  const handleSaveModelEdit = async (modelId: string) => {
    const trimmedName = editingModelName.trim();
    const trimmedDescription = editingModelDescription.trim();
    if (!trimmedName) {
      setFeedback('Error: Model display name cannot be empty.');
      return;
    }
    setSavingModelId(modelId);
    try {
      const res = await fetch(`/api/admin/models/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          custom_name: trimmedName,
          custom_description: trimmedDescription
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to update model details.'}`);
        return;
      }
      setModels(prev => prev.map(m => (m.id === modelId ? data : m)));
      handleCancelModelEdit();
      broadcastModelsUpdated();
      setFeedback(
        `Saved "${data.display_name || trimmedName}" in PostgreSQL. AI Workspace now reflects this update.`
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to update model.'}`);
    } finally {
      setSavingModelId(null);
    }
  };

  const handleAssignIcon = async (model: AiModel, iconKey: BrandIconKey) => {
    setIconPickerModelId(null);
    setSavingModelId(model.id);
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ custom_icon: iconKey })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to update brand logo.'}`);
        return;
      }
      setModels(prev => prev.map(m => (m.id === model.id ? data : m)));
      broadcastModelsUpdated();
      const brandSpec = AI_BRAND_LOGOS.find(b => b.key === iconKey);
      setFeedback(
        `Assigned ${brandSpec?.label || iconKey} logo to "${resolveEffectiveModelName(
          data
        )}" in PostgreSQL.`
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to update brand logo.'}`);
    } finally {
      setSavingModelId(null);
    }
  };

  const handleResetSingleModel = async (model: AiModel) => {
    setResettingModelId(model.id);
    try {
      const res = await fetch(`/api/admin/models/${model.id}/reset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to reset model.'}`);
        return;
      }
      setModels(prev => prev.map(m => (m.id === model.id ? data : m)));
      if (editingModelId === model.id) {
        handleCancelModelEdit();
      }
      broadcastModelsUpdated();
      setFeedback(
        `Restored "${data.default_name || data.display_name}" back to its default name, description, and logo.`
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to reset model.'}`);
    } finally {
      setResettingModelId(null);
    }
  };

  const handleResetAllCustomizations = async () => {
    setResettingAll(true);
    try {
      const res = await fetch('/api/admin/models/reset-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to reset model customizations.'}`);
        return;
      }
      if (Array.isArray(data.models)) {
        setModels(data.models);
      } else {
        await onRefreshModels();
      }
      handleCancelModelEdit();
      setIconPickerModelId(null);
      setConfirmResetAllOpen(false);
      broadcastModelsUpdated();
      setFeedback(
        data.message || 'All customized models have been restored to defaults.'
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to reset model customizations.'}`);
    } finally {
      setResettingAll(false);
    }
  };

  const handleSyncFreeModels = async () => {
    if (!token) return;
    setSyncingFreeModels(true);
    try {
      const res = await fetch('/api/admin/models/sync-openrouter-free', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to sync OpenRouter free models.'}`);
      } else {
        if (Array.isArray(data.models)) {
          setModels(data.models);
        } else {
          await onRefreshModels();
        }
        broadcastModelsUpdated();
        setFeedback(data.message || 'OpenRouter free models synced.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to sync OpenRouter free models.'}`);
    } finally {
      setSyncingFreeModels(false);
    }
  };

  const handleBulkToggleFreeModels = async (enableAll: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/models/free/toggle-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_enabled: enableAll })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to update OpenRouter free models.'}`);
      } else {
        if (Array.isArray(data.models)) {
          setModels(data.models);
        } else {
          await onRefreshModels();
        }
        broadcastModelsUpdated();
        setFeedback(
          data.message ||
            `All OpenRouter free models turned ${enableAll ? 'ON' : 'OFF'}.`
        );
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to update OpenRouter free models.'}`);
    }
  };

  const renderQuickLogoPopover = (model: AiModel, openUpward = false) => {
    if (iconPickerModelId !== model.id) return null;
    const effectiveName = resolveEffectiveModelName(model);
    const activeIconKey = resolveEffectiveModelIcon(model);

    return (
      <div
        ref={pickerContainerRef}
        role="dialog"
        aria-label={`Choose logo for ${effectiveName}`}
        className={`absolute left-0 ${
          openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        } w-64 sm:w-72 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.1] dark:border-white/[0.12] shadow-xl p-2.5 z-40`}
      >
        <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
          <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            Assign Brand Logo
          </span>
          <button
            type="button"
            onClick={() => setIconPickerModelId(null)}
            aria-label="Close logo picker"
            className="p-0.5 rounded-md text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {AI_BRAND_LOGOS.map(brand => {
            const isSelected = activeIconKey === brand.key;
            return (
              <button
                key={brand.key}
                type="button"
                onClick={() => handleAssignIcon(model, brand.key)}
                aria-label={`Set ${effectiveName} icon to ${brand.label}`}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] ring-1 ring-[#1f1f1f]/25 dark:ring-white/25'
                    : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]/70 text-[#444746] dark:text-[#c4c7c5]'
                }`}
              >
                <BrandLogoIcon iconKey={brand.key} sizeClass="w-3.5 h-3.5" />
                <span className="truncate">{brand.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Models Toolbar & Filter Controls */}
      <div className="bg-white dark:bg-[#1e1f20] p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModelFilter('all')}
            className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
              modelFilter === 'all'
                ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
            }`}
          >
            All Models ({models.length})
          </button>
          <button
            type="button"
            onClick={() => setModelFilter('flagship')}
            className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
              modelFilter === 'flagship'
                ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
            }`}
          >
            Flagship ({flagshipModelsList.length})
          </button>
          <button
            type="button"
            onClick={() => setModelFilter('free')}
            className={`h-8 px-3 rounded-full font-medium cursor-pointer transition-colors ${
              modelFilter === 'free'
                ? 'bg-[#e9eef6] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] font-semibold'
                : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
            }`}
          >
            OpenRouter Free ({freeOnCount}/{freeModelsList.length} ON)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={syncingFreeModels}
            onClick={handleSyncFreeModels}
            className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingFreeModels ? 'animate-spin' : ''}`} />
            <span>{syncingFreeModels ? 'Syncing...' : 'Sync Free Models'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggleFreeModels(true)}
            className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer whitespace-nowrap"
          >
            Turn All Free ON
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggleFreeModels(false)}
            className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[#444746] dark:text-[#9aa0a6] hover:text-red-600 font-semibold cursor-pointer whitespace-nowrap"
          >
            Turn All Free OFF
          </button>
          <button
            type="button"
            onClick={() => setConfirmResetAllOpen(true)}
            disabled={resettingAll}
            className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800/60 text-[#444746] dark:text-[#c4c7c5] hover:text-red-600 dark:hover:text-red-400 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              Reset All Customizations
              {customizedCount > 0 ? ` (${customizedCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* AI Brand Logo Library (Sticky on Desktop md+, Compact Non-Sticky Strip on Mobile) */}
      <div
        data-testid="brand-logo-library"
        className="md:sticky md:top-16 z-20 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
          <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            AI Brand Logo Library (Drag &amp; Drop onto any model)
          </div>
          <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
            Drag a brand badge onto any row below, or click a model&apos;s icon to pick
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          {AI_BRAND_LOGOS.map(brand => {
            const isDraggingThis = draggingBrandKey === brand.key;
            return (
              <div
                key={brand.key}
                draggable={true}
                data-brand-key={brand.key}
                aria-label={`Drag ${brand.label} logo`}
                title={`Drag ${brand.label} onto a model row`}
                onDragStart={e => {
                  setDraggingBrandKey(brand.key);
                  e.dataTransfer.setData('text/plain', brand.key);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onDragEnd={() => {
                  setDraggingBrandKey(null);
                  setDragOverModelId(null);
                }}
                className={`h-8 px-2.5 rounded-full border text-[11.5px] font-medium flex items-center gap-1.5 select-none cursor-grab active:cursor-grabbing transition-all ${
                  isDraggingThis
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 scale-95'
                    : 'bg-[#f0f4f9] dark:bg-[#282a2c] border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#e9eef6] dark:hover:bg-[#333538]'
                }`}
              >
                <GripVertical className="w-3 h-3 text-[#444746]/60 dark:text-[#9aa0a6]/60 shrink-0" />
                <BrandLogoIcon iconKey={brand.key} sizeClass="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{brand.shortLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Models List */}
      <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-visible">
        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
          {visibleModels.map((m, idx) => {
            const effectiveName = resolveEffectiveModelName(m);
            const effectiveDesc = resolveEffectiveModelDescription(m);
            const customized = isModelCustomized(m);
            const isDropTarget = dragOverModelId === m.id;

            return (
              <div
                key={m.id}
                data-model-row={m.id}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  if (dragOverModelId !== m.id) setDragOverModelId(m.id);
                }}
                onDragEnter={e => {
                  e.preventDefault();
                  setDragOverModelId(m.id);
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverModelId(prev => (prev === m.id ? null : prev));
                  }
                }}
                onDrop={e => {
                  e.preventDefault();
                  const key =
                    normalizeBrandIconKey(e.dataTransfer.getData('text/plain')) ||
                    draggingBrandKey;
                  setDragOverModelId(null);
                  setDraggingBrandKey(null);
                  if (key) handleAssignIcon(m, key);
                }}
                className={`p-4 space-y-2.5 transition-colors ${
                  isDropTarget
                    ? 'bg-blue-50/80 dark:bg-blue-950/35 ring-2 ring-inset ring-blue-500 rounded-xl'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setIconPickerModelId(prev => (prev === m.id ? null : m.id))
                        }
                        aria-label={`Change logo for ${effectiveName}`}
                        title="Click to assign a brand logo"
                        className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#1f1f1f]/40 dark:hover:border-white/30 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <WorkspaceModelIcon model={m} sizeClass="w-5 h-5" />
                      </button>
                      {renderQuickLogoPopover(m, idx >= visibleModels.length - 2 && visibleModels.length > 2)}
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingModelId === m.id ? (
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            handleSaveModelEdit(m.id);
                          }}
                          className="space-y-2 mb-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingModelName}
                            onChange={e => setEditingModelName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Escape') handleCancelModelEdit();
                            }}
                            aria-label={`Display name for ${effectiveName}`}
                            placeholder="Display name"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={editingModelDescription}
                            onChange={e => setEditingModelDescription(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Escape') handleCancelModelEdit();
                            }}
                            aria-label={`Description for ${effectiveName}`}
                            placeholder="Short subtitle / description shown in Workspace"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.15] dark:border-white/[0.15] bg-[#f0f4f9] dark:bg-[#131314] text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none resize-y"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="submit"
                              disabled={savingModelId === m.id}
                              aria-label="Save model changes"
                              className="h-7 px-3 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              {savingModelId === m.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelModelEdit}
                              aria-label="Cancel model edit"
                              className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] break-words">
                              {effectiveName}
                            </span>
                            {customized && (
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                · Customized
                              </span>
                            )}
                          </div>
                          {effectiveDesc && (
                            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] line-clamp-2 mt-0.5">
                              {effectiveDesc}
                            </p>
                          )}
                        </>
                      )}
                      <div className="text-[10px] font-mono text-[#444746]/80 dark:text-[#9aa0a6]/80 break-all mt-1">
                        {m.openrouter_model_id || m.model_name}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold shrink-0 ${
                      isFreeModel(m)
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                    }`}
                  >
                    {isFreeModel(m) ? 'FREE' : m.badge}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                  <span>Ctx: {m.context_window.toLocaleString()}</span>
                  <span>Out: {m.max_output_tokens.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStartModelEdit(m)}
                      aria-label={`Edit ${effectiveName}`}
                      className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    {customized && (
                      <button
                        type="button"
                        disabled={resettingModelId === m.id}
                        onClick={() => handleResetSingleModel(m)}
                        aria-label={`Reset ${effectiveName}`}
                        className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{resettingModelId === m.id ? 'Resetting...' : 'Reset'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={m.is_enabled}
                    aria-label={`Toggle ${effectiveName}`}
                    onClick={() => handleToggleModel(m)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      m.is_enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        m.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden md:block overflow-x-auto lg:overflow-visible">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4 font-medium">Logo, Display Name &amp; Subtitle</th>
                <th className="py-3 px-4 font-medium">Tier</th>
                <th className="py-3 px-4 font-medium">Context Window</th>
                <th className="py-3 px-4 font-medium">Max Output</th>
                <th className="py-3 px-4 font-medium">Workspace Status</th>
                <th className="py-3 px-4 font-medium text-right">ON / OFF Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {visibleModels.map((m, idx) => {
                const effectiveName = resolveEffectiveModelName(m);
                const effectiveDesc = resolveEffectiveModelDescription(m);
                const customized = isModelCustomized(m);
                const isDropTarget = dragOverModelId === m.id;

                return (
                  <tr
                    key={m.id}
                    data-model-row={m.id}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      if (dragOverModelId !== m.id) setDragOverModelId(m.id);
                    }}
                    onDragEnter={e => {
                      e.preventDefault();
                      setDragOverModelId(m.id);
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverModelId(prev => (prev === m.id ? null : prev));
                      }
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      const key =
                        normalizeBrandIconKey(e.dataTransfer.getData('text/plain')) ||
                        draggingBrandKey;
                      setDragOverModelId(null);
                      setDraggingBrandKey(null);
                      if (key) handleAssignIcon(m, key);
                    }}
                    className={`transition-colors ${
                      isDropTarget
                        ? 'bg-blue-50/85 dark:bg-blue-950/35 [&>td]:border-y-2 [&>td]:border-blue-500 [&>td:first-child]:border-l-2 [&>td:last-child]:border-r-2'
                        : 'hover:bg-[#f0f4f9]/60 dark:hover:bg-[#282a2c]/60'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        {/* Clickable Icon Button with Quick Logo Picker Popover */}
                        <div className="relative shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setIconPickerModelId(prev => (prev === m.id ? null : m.id))
                            }
                            aria-label={`Change logo for ${effectiveName}`}
                            title="Click to assign brand logo or drag & drop from library above"
                            className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#1f1f1f]/40 dark:hover:border-white/30 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <WorkspaceModelIcon model={m} sizeClass="w-5 h-5" />
                          </button>
                          {renderQuickLogoPopover(m, idx >= visibleModels.length - 2 && visibleModels.length > 2)}
                        </div>

                        <div className="min-w-0 flex-1 max-w-xl">
                          {editingModelId === m.id ? (
                            <form
                              onSubmit={e => {
                                e.preventDefault();
                                handleSaveModelEdit(m.id);
                              }}
                              className="space-y-1.5 mb-1.5"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editingModelName}
                                onChange={e => setEditingModelName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') handleCancelModelEdit();
                                }}
                                aria-label={`Display name for ${effectiveName}`}
                                placeholder="Display name"
                                className="w-full max-w-sm px-2.5 py-1 rounded-lg border border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none"
                              />
                              <textarea
                                rows={2}
                                value={editingModelDescription}
                                onChange={e => setEditingModelDescription(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') handleCancelModelEdit();
                                }}
                                aria-label={`Description for ${effectiveName}`}
                                placeholder="Short subtitle / description shown in Workspace"
                                className="w-full max-w-lg px-2.5 py-1.5 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-[#f0f4f9] dark:bg-[#131314] text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none resize-y"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="submit"
                                  disabled={savingModelId === m.id}
                                  aria-label="Save model changes"
                                  className="h-7 px-3 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{savingModelId === m.id ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelModelEdit}
                                  aria-label="Cancel model edit"
                                  className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                                  {effectiveName}
                                </span>
                                {customized && (
                                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                    · Customized
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartModelEdit(m)}
                                  aria-label={`Edit ${effectiveName}`}
                                  title="Edit display name and subtitle description"
                                  className="px-2 py-0.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[10px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>
                                {customized && (
                                  <button
                                    type="button"
                                    disabled={resettingModelId === m.id}
                                    onClick={() => handleResetSingleModel(m)}
                                    aria-label={`Reset ${effectiveName}`}
                                    title="Restore default name, description, and logo"
                                    className="px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>
                                      {resettingModelId === m.id ? 'Resetting...' : 'Reset'}
                                    </span>
                                  </button>
                                )}
                              </div>
                              {effectiveDesc && (
                                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] line-clamp-1 mt-0.5">
                                  {effectiveDesc}
                                </p>
                              )}
                            </>
                          )}
                          <div className="text-[10px] font-mono text-[#444746]/75 dark:text-[#9aa0a6]/75 mt-0.5">
                            {m.openrouter_model_id || m.model_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                          isFreeModel(m)
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                        }`}
                      >
                        {isFreeModel(m) ? 'FREE' : m.badge}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {m.context_window.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {m.max_output_tokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          m.is_enabled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]'
                        }`}
                      >
                        {m.is_enabled ? 'ON in Workspace' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.is_enabled}
                        aria-label={`Toggle ${effectiveName}`}
                        onClick={() => handleToggleModel(m)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          m.is_enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            m.is_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Global Reset All Customizations */}
      {confirmResetAllOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-all-models-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.1] dark:border-white/[0.1] shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h3
                  id="reset-all-models-title"
                  className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Reset All Model Customizations?
                </h3>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
                  This will restore every renamed model, custom subtitle description, and
                  assigned brand logo back to its original default in PostgreSQL. OpenRouter
                  routing slugs and ON/OFF switches will stay unchanged.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resettingAll}
                onClick={() => setConfirmResetAllOpen(false)}
                className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingAll}
                onClick={handleResetAllCustomizations}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingAll ? 'animate-spin' : ''}`} />
                <span>{resettingAll ? 'Resetting...' : 'Confirm Reset All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
