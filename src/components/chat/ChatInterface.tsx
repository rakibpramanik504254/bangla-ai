import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Bot,
  Brain,
  Code2,
  ChevronDown,
  Lock,
  Copy,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Chat, Message, AiModel } from '../../types/index.ts';
import { formatBDT, isSubscriptionActive } from '../../utils/billing.ts';

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm min-w-0 break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.substring(3, firstLineEnd).trim() || 'code';
          const code = part.substring(firstLineEnd + 1, part.length - 3);

          return (
            <div
              key={index}
              className="rounded-[8px] overflow-hidden border border-black/10 dark:border-white/10 bg-[#262626] text-white my-3 font-mono text-xs shadow-xs max-w-full"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1F1F1F] border-b border-white/10 text-[11px] text-gray-400">
                <span className="font-sans uppercase text-[10px] tracking-wider text-gray-400">{lang}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors font-sans text-[11px]"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 sm:p-4 overflow-x-auto leading-relaxed text-gray-200 max-w-full">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (line.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-sm font-bold text-black dark:text-white pt-2">
                    {line.substring(4)}
                  </h4>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-base font-bold text-black dark:text-white pt-2.5">
                    {line.substring(3)}
                  </h3>
                );
              }
              if (line.startsWith('* ') || line.startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40 mt-2 shrink-0" />
                    <span>{parseBold(line.substring(2))}</span>
                  </div>
                );
              }
              if (/^\d+\.\s/.test(line)) {
                return (
                  <div key={lIdx} className="pl-2 font-medium">
                    {parseBold(line)}
                  </div>
                );
              }
              if (line.trim() === '') {
                return <div key={lIdx} className="h-1" />;
              }
              return (
                <p key={lIdx} className="text-black/85 dark:text-white/85">
                  {parseBold(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function parseBold(text: string) {
  const segments = text.split(/(\*\*.*?\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-black dark:text-white">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith('*') && seg.endsWith('*')) {
      return (
        <em key={i} className="italic text-gray-500 dark:text-gray-400">
          {seg.slice(1, -1)}
        </em>
      );
    }
    return seg;
  });
}

export const ChatInterface: React.FC = () => {
  const { user, token, refreshUser, openPaymentModal } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('mod_gemini_2_5_flash');

  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        setModels(data);
        const def = data.find((m: AiModel) => m.is_default) || data[0];
        if (def) setSelectedModelId(def.id);
      })
      .catch(console.error);
  }, []);

  const fetchChats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [token]);

  useEffect(() => {
    if (!activeChatId || !token) {
      setMessages([]);
      return;
    }

    fetch(`/api/chats/${activeChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(console.error);
  }, [activeChatId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText]);

  const handleCreateNewChat = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New Conversation',
          modelId: selectedModelId
        })
      });
      if (res.ok) {
        const newChat = await res.json();
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setMessages([]);
        setInputMessage('');
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setSidebarOpen(false);
        }
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Create chat error:', err);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== id));
        if (activeChatId === id) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editTitle.trim()) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      if (res.ok) {
        setChats(prev => prev.map(c => (c.id === id ? { ...c, title: editTitle.trim() } : c)));
        setEditingChatId(null);
      }
    } catch (err) {
      console.error('Rename chat error:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isStreaming) return;

    if (!isSubscribed) {
      openPaymentModal('monthly');
      return;
    }

    let targetChatId = activeChatId;
    if (!targetChatId) {
      if (!token) return;
      try {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: textToSend.slice(0, 30) + '...',
            modelId: selectedModelId
          })
        });
        if (res.ok) {
          const newChat = await res.json();
          setChats(prev => [newChat, ...prev]);
          setActiveChatId(newChat.id);
          targetChatId = newChat.id;
        }
      } catch (err) {
        console.error('Failed to create initial chat:', err);
        return;
      }
    }

    const tempUserMsg: Message = {
      id: 'tmp-' + Date.now(),
      chat_id: targetChatId!,
      role: 'user',
      content: textToSend,
      model_id: selectedModelId,
      tokens_used: 0,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInputMessage('');
    setIsStreaming(true);
    setStreamedText('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: targetChatId,
          modelId: selectedModelId,
          message: textToSend
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to stream response from foundation model.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullAssistantReply = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.chunk) {
                  fullAssistantReply += parsed.chunk;
                  setStreamedText(fullAssistantReply);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {
                // Ignore parse errors on raw tokens
              }
            }
          }
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: 'asst-' + Date.now(),
          chat_id: targetChatId!,
          role: 'assistant',
          content: fullAssistantReply || 'No response generated.',
          model_id: selectedModelId,
          tokens_used: Math.round(fullAssistantReply.length / 4),
          created_at: new Date().toISOString()
        }
      ]);
      setStreamedText('');
      refreshUser();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          chat_id: targetChatId!,
          role: 'assistant',
          content: `⚠️ Error: ${err.message}`,
          model_id: selectedModelId,
          tokens_used: 0,
          created_at: new Date().toISOString()
        }
      ]);
      setStreamedText('');
    } finally {
      setIsStreaming(false);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];
  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const suggestions = [
    'Draft a strategic B2B technology partnership proposal',
    'Write a TypeScript function to validate Bangladeshi phone numbers',
    'Outline a 90-day growth playbook for an e-commerce platform',
    'Analyze time complexity and space trade-offs for graph algorithms'
  ];

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-white dark:bg-[#1F1F1F] transition-colors relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Sidebar (Slide-over on mobile, inline on desktop) */}
      <aside
        className={`${
          sidebarOpen
            ? 'translate-x-0 w-72 max-w-[82vw] md:w-72'
            : '-translate-x-full w-72 md:w-0 md:translate-x-0 md:border-r-0'
        } fixed md:relative top-16 md:top-0 bottom-0 left-0 z-30 md:z-20 shrink-0 border-r border-black/[0.08] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#242424] flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 h-9 px-3.5 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse sidebar"
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#2D2D2D] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              {searchQuery ? 'No matching chats' : 'No chats yet'}
            </div>
          ) : (
            filteredChats.map(c => (
              <div
                key={c.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-[8px] text-xs transition-colors ${
                  activeChatId === c.id
                    ? 'bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                {editingChatId === c.id ? (
                  <div className="flex items-center gap-2 truncate flex-1 mr-1 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <form onSubmit={e => handleSaveRename(c.id, e)} className="flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => setEditingChatId(null)}
                        className="w-full bg-white dark:bg-[#2D2D2D] px-1.5 py-0.5 rounded-[4px] border border-black dark:border-white text-xs focus:outline-none"
                      />
                    </form>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatId(c.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className="flex items-center gap-2 truncate flex-1 mr-1 min-w-0 text-left cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{c.title}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingChatId(c.id);
                      setEditTitle(c.title);
                    }}
                    aria-label="Rename conversation"
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => handleDeleteChat(c.id, e)}
                    aria-label="Delete conversation"
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.08] text-[11px] font-mono text-gray-500 flex items-center justify-between">
          <span>Conversations:</span>
          <span className="font-semibold text-black dark:text-white">{chats.length}</span>
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <main className="flex-1 min-w-0 w-full flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#1F1F1F]">
        {/* Header Bar */}
        <div className="h-14 border-b border-black/[0.08] dark:border-white/[0.08] px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 bg-white/90 dark:bg-[#1F1F1F]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Model Selector */}
            <div className="relative min-w-0 max-w-full">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="max-w-full min-w-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-black/[0.12] dark:border-white/[0.15] hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#262626] text-xs font-medium text-black dark:text-white transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="font-semibold truncate">{selectedModel?.display_name || 'Select Model'}</span>
                <span className="hidden sm:inline-block shrink-0 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-gray-600 dark:text-gray-400">
                  {selectedModel?.badge}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
              </button>

              {modelDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-[calc(100vw-1.5rem)] max-w-[304px] sm:w-76 rounded-[8px] bg-white dark:bg-[#262626] border border-black/[0.12] dark:border-white/[0.15] shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  onClick={() => setModelDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[10px] uppercase font-mono text-gray-400 border-b border-black/[0.06] dark:border-white/[0.06]">
                    Frontier Foundation Models
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModelId(m.id)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                          selectedModelId === m.id
                            ? 'bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {m.badge === 'reasoning' ? (
                            <Brain className="w-3.5 h-3.5 text-black dark:text-white" />
                          ) : m.badge === 'coding' ? (
                            <Code2 className="w-3.5 h-3.5 text-black dark:text-white" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-black dark:text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">{m.display_name}</span>
                            {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />}
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 font-normal">
                            {m.description_en}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono shrink-0">
              <span className="text-gray-500 hidden sm:inline">Tokens:</span>
              <span className="font-semibold text-black dark:text-white">
                {Math.max(0, (user.usage_limit || 0) - (user.current_usage || 0)).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Gating Banner if unpaid */}
        {!isSubscribed && (
          <div className="bg-[#1F1F1F] text-white dark:bg-white dark:text-[#1F1F1F] px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs z-10 text-center sm:text-left">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                <strong>Subscription Required:</strong> Active subscription needed to converse with foundation models.
              </span>
            </div>
            <button
              onClick={() => openPaymentModal('monthly')}
              className="h-8 px-4 rounded-full bg-white text-black dark:bg-[#1F1F1F] dark:text-white font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 w-full sm:w-auto"
            >
              Subscribe (৳699/mo)
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-6 sm:py-8 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="min-h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-6 sm:py-12 space-y-5 sm:space-y-6">
              <div className="w-12 h-12 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#262626] text-black dark:text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 px-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">
                  Ready when you are.
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Powered by <span className="font-semibold text-black dark:text-white">{selectedModel?.display_name}</span>. Start a query below or select a prompt:
                </p>
              </div>

              {/* Suggestions Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="w-full p-3.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#262626] text-xs text-gray-700 dark:text-gray-300 transition-all flex items-start justify-between gap-2.5 group cursor-pointer shadow-xs text-left"
                  >
                    <span className="leading-snug flex-1 min-w-0 break-words">{s}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 group-hover:text-black dark:group-hover:text-white transition-all shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`flex gap-2.5 sm:gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#262626] text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`min-w-0 max-w-[88%] sm:max-w-[80%] rounded-[12px] px-3.5 sm:px-4 py-3 text-sm leading-relaxed break-words ${
                      m.role === 'user'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-normal'
                        : 'bg-white dark:bg-[#262626] text-black dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-xs'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    ) : (
                      <FormattedMessage content={m.content} />
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="w-7 h-7 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#262626] text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[80%] rounded-[12px] px-4 py-3 bg-white dark:bg-[#262626] text-black dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
                    {streamedText ? (
                      <FormattedMessage content={streamedText} />
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-ping" />
                        <span>Generating response with {selectedModel?.display_name}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Box Bar */}
        <div className="p-2.5 sm:p-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1F1F1F]">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end rounded-[12px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#262626] focus-within:border-black dark:focus-within:border-white transition-all p-2 shadow-xs"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isSubscribed
                    ? `Message ${selectedModel?.display_name}...`
                    : 'Activate a subscription plan to chat...'
                }
                disabled={!isSubscribed}
                className="w-full min-w-0 resize-none bg-transparent px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none max-h-36 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming || !isSubscribed}
                className="w-9 h-9 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black flex items-center justify-center disabled:opacity-20 transition-all shrink-0 cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 px-1 sm:px-2 mt-2 font-mono">
              <span>Enter to send • Shift+Enter for new line</span>
              <span className="truncate max-w-full">{selectedModel?.display_name}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
