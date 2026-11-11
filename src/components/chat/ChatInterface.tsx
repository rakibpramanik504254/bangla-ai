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
    <div className="space-y-3 leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.substring(3, firstLineEnd).trim() || 'code';
          const code = part.substring(firstLineEnd + 1, part.length - 3);

          return (
            <div key={index} className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950 text-gray-100 my-2.5 font-mono text-xs">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-900 border-b border-gray-800 text-[11px] text-gray-400">
                <span className="font-sans uppercase text-[10px] tracking-wider text-gray-500">{lang}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-gray-850 transition-colors font-sans text-[11px]"
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
              <pre className="p-4 overflow-x-auto leading-relaxed text-gray-200">
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
                  <h4 key={lIdx} className="text-sm font-bold text-gray-900 dark:text-white pt-2">
                    {line.substring(4)}
                  </h4>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-base font-bold text-gray-900 dark:text-white pt-2.5">
                    {line.substring(3)}
                  </h3>
                );
              }
              if (line.startsWith('* ') || line.startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mt-2 shrink-0" />
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
                <p key={lIdx} className="text-gray-800 dark:text-gray-200">
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
        <strong key={i} className="font-semibold text-gray-950 dark:text-white">
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          title: 'New Chat',
          modelId: selectedModelId
        })
      });
      if (res.ok) {
        const newChat = await res.json();
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setMessages([]);
        setInputMessage('');
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
          const remaining = chats.filter(c => c.id !== id);
          setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !token) return;
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
    if (!textToSend || isStreaming || !token) return;

    if (!isSubscribed) {
      openPaymentModal('monthly');
      return;
    }

    setInputMessage('');
    setIsStreaming(true);
    setStreamedText('');

    const tempUserMsg: Message = {
      id: 'temp_' + Date.now(),
      chat_id: activeChatId || 'temp',
      role: 'user',
      content: textToSend,
      model_id: selectedModelId,
      tokens_used: 0,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: activeChatId,
          message: textToSend,
          modelId: selectedModelId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chat processing error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          const lines = textChunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.type === 'start') {
                  if (!activeChatId) {
                    setActiveChatId(data.chatId);
                    fetchChats();
                  }
                } else if (data.type === 'chunk') {
                  fullAssistantText += data.text;
                  setStreamedText(fullAssistantText);
                } else if (data.type === 'done') {
                  setMessages(prev => [...prev, data.assistantMessage]);
                  setStreamedText('');
                  refreshUser();
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                // partial chunk
              }
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          chat_id: activeChatId || '',
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-gray-950 transition-colors">
      {/* Collapsible Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64 sm:w-72' : 'w-0'
        } shrink-0 border-r border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/40 flex flex-col transition-all duration-300 overflow-hidden relative z-20`}
      >
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 py-2 px-3 rounded-lg bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse sidebar"
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2.5">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                onClick={() => setActiveChatId(c.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  activeChatId === c.id
                    ? 'bg-gray-200/70 dark:bg-gray-800 text-gray-950 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 mr-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  {editingChatId === c.id ? (
                    <form onSubmit={e => handleSaveRename(c.id, e)} className="flex-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => setEditingChatId(null)}
                        className="w-full bg-white dark:bg-gray-900 px-1 py-0.5 rounded border border-gray-400 text-xs focus:outline-none"
                      />
                    </form>
                  ) : (
                    <span className="truncate">{c.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingChatId(c.id);
                      setEditTitle(c.title);
                    }}
                    aria-label="Rename conversation"
                    className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => handleDeleteChat(c.id, e)}
                    aria-label="Delete conversation"
                    className="p-0.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-[11px] font-mono text-gray-400 flex items-center justify-between">
          <span>Total Chats:</span>
          <span className="font-bold text-gray-700 dark:text-gray-300">{chats.length}</span>
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header Bar */}
        <div className="h-14 border-b border-gray-100 dark:border-gray-800/80 px-4 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white transition-all"
              >
                <Sparkles className="w-3 h-3 text-gray-400" />
                <span>{selectedModel?.display_name || 'Select Model'}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {selectedModel?.badge}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {modelDropdownOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  onClick={() => setModelDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-mono text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    Foundation Models
                  </div>
                  {models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${
                        selectedModelId === m.id
                          ? 'bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className="mt-0.5">
                        {m.badge === 'reasoning' ? (
                          <Brain className="w-3.5 h-3.5 text-purple-500" />
                        ) : m.badge === 'coding' ? (
                          <Code2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>{m.display_name}</span>
                          {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />}
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 font-normal">
                          {m.description_en}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-gray-400">Tokens Remaining:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(user.usage_limit - user.current_usage).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Gating Banner if unpaid */}
        {!isSubscribed && (
          <div className="bg-gray-950 text-white dark:bg-white dark:text-gray-950 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-10">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Subscription Required:</strong> Active subscription needed to converse with foundation models.
              </span>
            </div>
            <button
              onClick={() => openPaymentModal('monthly')}
              className="px-3 py-1 rounded-md bg-white text-gray-950 dark:bg-gray-950 dark:text-white font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Subscribe (৳1,299/mo)
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-12 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-center font-bold text-base">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Ready when you are.
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Powered by <strong>{selectedModel?.display_name}</strong>. Start typing below or pick a prompt:
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left pt-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-xs text-gray-700 dark:text-gray-300 transition-all flex items-start justify-between gap-2 group"
                  >
                    <span>{s}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === 'user'
                        ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <FormattedMessage content={m.content} />
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-800">
                    {streamedText ? (
                      <FormattedMessage content={streamedText} />
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-ping" />
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
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 focus-within:border-gray-400 dark:focus-within:border-gray-600 focus-within:ring-1 focus-within:ring-gray-400 transition-all p-1.5"
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
                className="w-full resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none max-h-36 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming || !isSubscribed}
                className="p-2 rounded-lg bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 disabled:opacity-30 transition-all shrink-0"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-gray-400 px-2 mt-1.5 font-mono">
              <span>Enter to send • Shift+Enter for new line</span>
              <span>{selectedModel?.display_name}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
