import React, { useEffect, useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { UserMemory, UserMemoryCategory } from '../../types/index.ts';
import {
  MAX_MEMORY_CONTENT_CHARS,
  MIN_MEMORY_CONTENT_CHARS,
  formatMemoryCategoryLabel,
} from '../../utils/userMemory.ts';

interface WorkspaceMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: UserMemory[];
  isLoading: boolean;
  onAddMemory: (content: string, category: UserMemoryCategory) => Promise<void>;
  onDeleteMemory: (memoryId: string) => Promise<void>;
  onClearAllMemories: () => Promise<void>;
}

const MEMORY_CATEGORIES: Array<{ id: UserMemoryCategory; label: string }> = [
  { id: 'preference', label: 'Preference' },
  { id: 'instruction', label: 'Instruction' },
  { id: 'context', label: 'Context' },
  { id: 'profile', label: 'Profile' },
];

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const WorkspaceMemoryModal: React.FC<WorkspaceMemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  isLoading,
  onAddMemory,
  onDeleteMemory,
  onClearAllMemories,
}) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<UserMemoryCategory>('preference');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClearAll(false);
      setError(null);
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < MIN_MEMORY_CONTENT_CHARS) {
      setError(`Please enter at least ${MIN_MEMORY_CONTENT_CHARS} characters.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onAddMemory(trimmed, category);
      setContent('');
    } catch (err: any) {
      setError(err?.message || 'Could not save memory.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);
    try {
      await onDeleteMemory(id);
    } catch (err: any) {
      setError(err?.message || 'Could not delete memory.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setError(null);
    setClearingAll(true);
    try {
      await onClearAllMemories();
      setConfirmClearAll(false);
    } catch (err: any) {
      setError(err?.message || 'Could not clear memories.');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Persistent User Memory"
      data-testid="workspace-memory-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden text-[#1f1f1f] dark:text-[#e3e3e3]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#1e1f20]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                  Memory
                </h2>
                <span
                  data-testid="memory-count-badge"
                  className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]"
                >
                  {memories.length} saved
                </span>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate">
                Preferences, instructions, and context remembered across all your chats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Memory manager"
            data-testid="close-memory-modal-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#f0f4f9]/75 dark:bg-[#131314] p-4 sm:p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Add New Memory Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-3.5 sm:p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="memory-input"
                className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                Add instruction or context
              </label>
              <span className="text-[11px] font-mono text-[#444746]/80 dark:text-[#9aa0a6]/80">
                {content.length}/{MAX_MEMORY_CONTENT_CHARS}
              </span>
            </div>

            <textarea
              id="memory-input"
              data-testid="memory-add-input"
              rows={2}
              maxLength={MAX_MEMORY_CONTENT_CHARS}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder='e.g. "Always reply with TypeScript examples" or "I run an e-commerce store in Dhaka"'
              className="w-full resize-none rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] px-3 py-2 text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder-[#444746]/70 dark:placeholder-[#9aa0a6]/70 focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Memory category"
                className="flex flex-wrap items-center gap-1.5"
              >
                {MEMORY_CATEGORIES.map((cat) => {
                  const selected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      aria-pressed={selected}
                      className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                          : 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={saving || content.trim().length < MIN_MEMORY_CONTENT_CHARS}
                data-testid="memory-save-btn"
                className="h-8 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Save Memory</span>
              </button>
            </div>
          </form>

          {/* Saved Memories List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="text-xs font-semibold text-[#444746] dark:text-[#9aa0a6] uppercase tracking-wider">
                Saved Memories
              </h3>
              {memories.length > 0 && (
                confirmClearAll ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={clearingAll}
                      onClick={handleClearAll}
                      data-testid="confirm-clear-memories-btn"
                      className="h-6 px-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium cursor-pointer disabled:opacity-50"
                    >
                      {clearingAll ? 'Clearing...' : 'Confirm Clear All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="h-6 px-2 rounded-full text-[11px] text-[#444746] dark:text-[#9aa0a6] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    data-testid="clear-all-memories-btn"
                    className="text-[11.5px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )
              )}
            </div>

            {isLoading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs text-[#444746] dark:text-[#9aa0a6]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading memories...</span>
              </div>
            ) : memories.length === 0 ? (
              <div
                data-testid="memory-empty-state"
                className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] p-6 text-center space-y-2"
              >
                <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center mx-auto">
                  <Sparkles className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
                </div>
                <p className="text-[13px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                  No memories saved yet
                </p>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-sm mx-auto leading-relaxed">
                  Tell the AI something like &ldquo;Remember that I prefer concise Bengali answers&rdquo; in any chat, or add a rule above to apply it across all sessions.
                </p>
              </div>
            ) : (
              <div data-testid="memory-list" className="space-y-2">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    data-testid="memory-item-card"
                    className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] leading-relaxed break-words">
                        {mem.content}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                        <span className="font-medium text-[#1f1f1f]/80 dark:text-[#e3e3e3]/80">
                          {formatMemoryCategoryLabel(mem.category)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{mem.source === 'auto' ? 'Learned from chat' : 'Added manually'}</span>
                        {mem.updated_at && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatShortDate(mem.updated_at)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === mem.id}
                      onClick={() => handleDelete(mem.id)}
                      aria-label={`Delete memory: ${mem.content}`}
                      data-testid="delete-memory-btn"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      {deletingId === mem.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
