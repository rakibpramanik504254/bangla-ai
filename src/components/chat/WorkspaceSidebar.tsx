import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Search,
  PanelLeftClose,
  X,
  MoreVertical,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { Chat, User } from '../../types/index.ts';
import { partitionWorkspaceChats } from '../../utils/workspaceSidebar.ts';
import { BrandLogo } from '../common/BrandLogo.tsx';

interface WorkspaceSidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: () => void;
  onTogglePinChat: (chatId: string, nextPinned: boolean) => void;
  onSaveRenameChat: (chatId: string, newTitle: string) => Promise<void> | void;
  onDeleteChat: (chatId: string) => void;
  user: User | null;
  isSubscribed: boolean;
  onOpenSettings: () => void;
  onNavigateHome?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  sidebarOpen,
  onCloseSidebar,
  chats,
  activeChatId,
  onSelectChat,
  onCreateNewChat,
  onTogglePinChat,
  onSaveRenameChat,
  onDeleteChat,
  user,
  isSubscribed,
  onOpenSettings,
  onNavigateHome,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const { pinnedChats, recentChats } = partitionWorkspaceChats(chats, searchQuery);

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!openMenuChatId) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuChatId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openMenuChatId]);

  const commitRename = async (chatId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await onSaveRenameChat(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const planBadge =
    user?.role === 'admin' ? 'Admin' : isSubscribed ? 'Pro' : 'Free';

  const renderChatRow = (chat: Chat) => {
    const isActive = activeChatId === chat.id;
    const isEditing = editingChatId === chat.id;
    const isMenuOpen = openMenuChatId === chat.id;

    return (
      <div
        key={chat.id}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-full text-[13px] transition-colors ${
          isActive
            ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-medium'
            : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
        }`}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitRename(chat.id);
            }}
            className="flex-1 min-w-0 flex items-center gap-2"
          >
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => commitRename(chat.id)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingChatId(null);
                }
              }}
              aria-label="Conversation title"
              className="w-full px-2 py-0.5 rounded-md bg-white dark:bg-[#131314] border border-black/20 dark:border-white/20 text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              onSelectChat(chat.id);
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                onCloseSidebar();
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
          >
            {chat.pinned ? (
              <Pin className="w-3.5 h-3.5 shrink-0 text-[#444746] dark:text-[#9aa0a6]" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#444746]/75 dark:text-[#9aa0a6]/80" />
            )}
            <span className="truncate leading-snug">{chat.title}</span>
          </button>
        )}

        {!isEditing && (
          <div
            ref={isMenuOpen ? menuContainerRef : undefined}
            className="relative shrink-0"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuChatId((prev) => (prev === chat.id ? null : chat.id));
              }}
              aria-label={`Actions for ${chat.title}`}
              aria-expanded={isMenuOpen}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-opacity cursor-pointer ${
                isMenuOpen || isActive
                  ? 'opacity-100 text-[#1f1f1f] dark:text-[#e3e3e3]'
                  : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 text-[#444746] dark:text-[#9aa0a6]'
              } hover:bg-black/[0.06] dark:hover:bg-white/[0.08]`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] shadow-lg py-1.5 z-50 text-[12.5px]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuChatId(null);
                    onTogglePinChat(chat.id, !chat.pinned);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  {chat.pinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                      <span>Unpin</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                      <span>Pin chat</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuChatId(null);
                    setEditingChatId(chat.id);
                    setEditTitle(chat.title);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                  <span>Rename</span>
                </button>
                <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuChatId(null);
                    onDeleteChat(chat.id);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-30 md:hidden transition-opacity"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        data-testid="workspace-sidebar"
        className={`${
          sidebarOpen
            ? 'translate-x-0 w-[280px] max-w-[85vw] md:w-[280px]'
            : '-translate-x-full pointer-events-none md:pointer-events-auto w-[280px] md:w-0 md:translate-x-0 md:border-r-0'
        } fixed md:relative top-0 bottom-0 left-0 z-40 md:z-20 shrink-0 border-r border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] flex flex-col transition-all duration-300 ease-out overflow-hidden`}
      >
        {/* Top Brand + Search & Collapse Controls */}
        <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between gap-2 shrink-0">
          {onNavigateHome ? (
            <button
              type="button"
              onClick={onNavigateHome}
              title="Back to Bangla-AI.pro homepage"
              className="flex items-center gap-2.5 min-w-0 px-1.5 py-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <BrandLogo className="w-6 h-6 shrink-0" />
              <span className="font-semibold text-[14px] tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                Bangla-AI.pro
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0 px-1.5 py-1">
              <BrandLogo className="w-6 h-6 shrink-0" />
              <span className="font-semibold text-[14px] tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                Bangla-AI.pro
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => {
                  if (prev) setSearchQuery('');
                  return !prev;
                });
              }}
              aria-label="Search conversations"
              aria-pressed={searchOpen}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                searchOpen
                  ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                  : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCloseSidebar}
              aria-label="Collapse sidebar"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4 hidden md:block" />
              <X className="w-4 h-4 md:hidden" />
            </button>
          </div>
        </div>

        {/* Inline Expandable Search */}
        {searchOpen && (
          <div className="px-3.5 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#444746] dark:text-[#9aa0a6]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder-[#444746]/70 dark:placeholder-[#9aa0a6]/70 focus:outline-none focus:border-black/25 dark:focus:border-white/25"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary New Chat Action */}
        <div className="px-3.5 py-2 shrink-0">
          <button
            type="button"
            onClick={onCreateNewChat}
            data-testid="sidebar-new-chat-btn"
            className="w-full h-10 px-3.5 rounded-full bg-white/80 hover:bg-white dark:bg-[#282a2c]/70 dark:hover:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.06] text-[#1f1f1f] dark:text-[#e3e3e3] text-[13px] font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#444746] dark:text-[#c4c7c5]" />
            <span>New chat</span>
          </button>
        </div>

        {/* Grouped Conversations List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
          {pinnedChats.length === 0 && recentChats.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
              {searchQuery ? 'No matching conversations' : 'Start a new conversation above'}
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <section aria-label="Pinned conversations" className="space-y-0.5">
                  <div className="px-3 pb-1 text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                    Pinned
                  </div>
                  {pinnedChats.map(renderChatRow)}
                </section>
              )}

              {recentChats.length > 0 && (
                <section aria-label="Recent conversations" className="space-y-0.5">
                  <div className="px-3 pb-1 text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                    Recent
                  </div>
                  {recentChats.map(renderChatRow)}
                </section>
              )}
            </>
          )}
        </div>

        {/* Fixed User Profile Footer */}
        <div className="p-2.5 border-t border-black/[0.08] dark:border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="sidebar-user-profile-btn"
            className="w-full px-2.5 py-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/10 dark:border-white/15"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-xs flex items-center justify-center shrink-0">
                  {(user?.name || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                    {user?.name || 'Member'}
                  </span>
                  <span
                    className={`shrink-0 px-1.5 py-0.2 rounded text-[10px] font-medium ${
                      isSubscribed
                        ? 'bg-black/[0.07] dark:bg-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3]'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {planBadge}
                  </span>
                </div>
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] truncate">
                  Account &amp; settings
                </p>
              </div>
            </div>

            <Settings className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
};
