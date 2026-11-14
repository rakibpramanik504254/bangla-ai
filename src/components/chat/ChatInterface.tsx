import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Bot,
  Brain,
  Code2,
  ChevronDown,
  Lock,
  Copy,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Search,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  ThumbsUp,
  ThumbsDown,
  Home,
  Sun,
  Moon,
  User as UserIcon,
  Shield,
  FileText,
  FileCode2,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Chat, Message, AiModel, ChatAttachment } from '../../types/index.ts';
import { createSseLineParser, parseChatStreamPayload } from '../../utils/sse.ts';
import {
  parseMarkdownBlocks,
  parseInlineSegments,
  estimateReadingStats
} from '../../utils/markdownBlocks.ts';
import { WorkspaceCodeBlock } from './WorkspaceCodeBlock.tsx';
import { ChatComposer } from './ChatComposer.tsx';
import { formatFileSize } from '../../utils/chatAttachments.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';
import { BrandLogo } from '../common/BrandLogo.tsx';

function renderInlineSegments(text: string): React.ReactNode {
  const segments = parseInlineSegments(text);
  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'code':
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-[5px] bg-black/[0.06] dark:bg-white/[0.1] text-[#9D2E87] dark:text-[#61AFEF] font-mono text-[12px] break-all"
          >
            {seg.value}
          </code>
        );
      case 'bold':
        return (
          <strong key={i} className="font-semibold text-black dark:text-white">
            {seg.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={i} className="italic text-gray-600 dark:text-gray-300">
            {seg.value}
          </em>
        );
      case 'link':
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-black/30 dark:decoration-white/40 hover:text-black dark:hover:text-white font-medium"
          >
            {seg.label}
          </a>
        );
      default:
        return <React.Fragment key={i}>{seg.value}</React.Fragment>;
    }
  });
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3 leading-relaxed text-[13.5px] sm:text-sm min-w-0 max-w-full break-words">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <WorkspaceCodeBlock
              key={index}
              code={block.code}
              language={block.language}
              index={index}
              isStreaming={block.isStreaming}
            />
          );
        }

        if (block.type === 'heading') {
          const headingClasses: Record<1 | 2 | 3 | 4, string> = {
            1: 'text-lg font-bold text-black dark:text-white pt-2',
            2: 'text-base font-bold text-black dark:text-white pt-2',
            3: 'text-[14.5px] font-bold text-black dark:text-white pt-1.5',
            4: 'text-sm font-semibold text-black dark:text-white pt-1'
          };
          return (
            <h4 key={index} className={headingClasses[block.level]}>
              {renderInlineSegments(block.text)}
            </h4>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={index}
              className="rounded-[8px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] px-3.5 py-2.5 text-black/80 dark:text-white/85 italic space-y-1"
            >
              {block.lines.map((qLine, qIdx) => (
                <p key={qIdx}>{renderInlineSegments(qLine)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'hr') {
          return <hr key={index} className="border-black/[0.08] dark:border-white/[0.08] my-2" />;
        }

        if (block.type === 'list') {
          return (
            <div key={index} className="space-y-1.5 pl-1">
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-2.5 min-w-0">
                  {block.ordered ? (
                    <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 mt-0.5 shrink-0 tabular-nums">
                      {itemIdx + 1}.
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-black/45 dark:bg-white/45 mt-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 text-black/85 dark:text-white/85">
                    {renderInlineSegments(item)}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={index}
              className="my-2 overflow-x-auto max-w-full rounded-[8px] border border-black/[0.09] dark:border-white/[0.1]"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-black/[0.03] dark:bg-white/[0.05] border-b border-black/[0.08] dark:border-white/[0.08]">
                  <tr>
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3 py-2 font-semibold text-black dark:text-white whitespace-nowrap"
                      >
                        {renderInlineSegments(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 text-black/80 dark:text-white/80 align-top"
                        >
                          {renderInlineSegments(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={index} className="text-black/85 dark:text-white/85 whitespace-pre-wrap break-words">
            {renderInlineSegments(block.text)}
          </p>
        );
      })}
    </div>
  );
};

interface ChatInterfaceProps {
  onNavigateHome?: () => void;
  onNavigateAccount?: () => void;
  onNavigateAdmin?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onNavigateHome,
  onNavigateAccount,
  onNavigateAdmin
}) => {
  const { user, token, refreshUser, openPaymentModal, theme, toggleTheme } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('mod_gemini_2_5_flash');

  const [inputMessage, setInputMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [isDraggingWorkspace, setIsDraggingWorkspace] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const workspaceDragCounterRef = useRef(0);

  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  useEffect(() => {
    fetch('/api/models', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setModels(data);
        const def = data.find((m: AiModel) => m.is_default) || data[0];
        if (def) setSelectedModelId(def.id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let wasDesktop = window.innerWidth >= 768;
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      if (wasDesktop && !isDesktop) {
        setSidebarOpen(false);
      } else if (!wasDesktop && isDesktop) {
        setSidebarOpen(true);
      }
      wasDesktop = isDesktop;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt !== undefined ? customPrompt : inputMessage).trim();
    const attachmentsToSend = customPrompt !== undefined ? [] : pendingAttachments;
    if ((!textToSend && attachmentsToSend.length === 0) || isStreaming) return;

    if (!isSubscribed) {
      openPaymentModal('monthly');
      return;
    }

    let targetChatId = activeChatId;
    if (!targetChatId) {
      if (!token) return;
      try {
        const titleSeed = textToSend || attachmentsToSend[0]?.name || 'New Conversation';
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: titleSeed.slice(0, 30) + (titleSeed.length > 30 ? '...' : ''),
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
      ...(attachmentsToSend.length > 0 ? { attachments: attachmentsToSend } : {}),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    if (customPrompt === undefined) {
      setInputMessage('');
      setPendingAttachments([]);
    }
    setIsStreaming(true);
    setStreamedText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let fullAssistantReply = '';
    let finalizedMessage: Message | null = null;
    let wasAborted = false;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: targetChatId,
          modelId: selectedModelId,
          message: textToSend,
          attachments: attachmentsToSend
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to stream response from foundation model.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      const lineParser = createSseLineParser();

      const processSsePayloads = (payloads: string[]) => {
        for (const payload of payloads) {
          const evt = parseChatStreamPayload(payload);
          if (evt.kind === 'error') {
            throw new Error(evt.message);
          }
          if (evt.kind === 'chunk') {
            fullAssistantReply += evt.text;
            setStreamedText(fullAssistantReply);
          } else if (evt.kind === 'done' && evt.assistantMessage) {
            finalizedMessage = evt.assistantMessage;
          }
        }
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const decoded = decoder.decode(value, { stream: true });
          processSsePayloads(lineParser.feed(decoded));
        }
        const tail = decoder.decode();
        if (tail) {
          processSsePayloads(lineParser.feed(tail));
        }
        processSsePayloads(lineParser.flush());
      }

      const finalMsg: Message = finalizedMessage || {
        id: 'asst-' + Date.now(),
        chat_id: targetChatId!,
        role: 'assistant',
        content: fullAssistantReply || 'No response generated.',
        model_id: selectedModelId,
        tokens_used: Math.round(fullAssistantReply.length / 4),
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, finalMsg]);
      setStreamedText('');
      refreshUser();
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') {
        wasAborted = true;
        if (fullAssistantReply.trim().length > 0) {
          const partialMsg: Message = {
            id: 'asst-stopped-' + Date.now(),
            chat_id: targetChatId!,
            role: 'assistant',
            content: fullAssistantReply,
            model_id: selectedModelId,
            tokens_used: Math.round(fullAssistantReply.length / 4),
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, partialMsg]);
        }
        setStreamedText('');
      } else {
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
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
      if (wasAborted) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];
  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCopyResponse = async (msgId: string, content: string) => {
    await copyTextSafely(content);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId(prev => (prev === msgId ? null : prev));
    }, 1800);
  };

  const handleDownloadResponse = (msgId: string, content: string, modelLabel: string) => {
    const header = `<!-- Generated via Bangla AI (${modelLabel}) -->\n\n`;
    const blob = new Blob([header + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bangla-ai-${msgId.slice(-8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFullChat = () => {
    if (messages.length === 0) return;
    const activeChat = chats.find(c => c.id === activeChatId);
    const lines = [
      `# ${activeChat?.title || 'Bangla AI Conversation'}`,
      '',
      ...messages.map(m => {
        const speaker = m.role === 'user' ? 'User' : `Assistant (${getModelDisplayName(m.model_id)})`;
        return `## ${speaker}\n\n${m.content}\n`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bangla-ai-chat-${(activeChatId || 'export').slice(-8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeak = (msgId: string, content: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (speakingMessageId === msgId) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }
    synth.cancel();
    const plainText = content
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
      .replace(/[*_`#>-]/g, ' ')
      .trim();
    if (!plainText) return;
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = /[\u0980-\u09FF]/.test(plainText) ? 'bn-BD' : 'en-US';
    utterance.onend = () => setSpeakingMessageId(prev => (prev === msgId ? null : prev));
    utterance.onerror = () => setSpeakingMessageId(prev => (prev === msgId ? null : prev));
    setSpeakingMessageId(msgId);
    synth.speak(utterance);
  };

  const handleToggleFeedback = (msgId: string, vote: 'up' | 'down') => {
    setMessageFeedback(prev => {
      if (prev[msgId] === vote) {
        const next = { ...prev };
        delete next[msgId];
        return next;
      }
      return { ...prev, [msgId]: vote };
    });
  };

  const handleRegenerate = (assistantIdx: number) => {
    if (isStreaming) return;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        handleSendMessage(messages[i].content);
        return;
      }
    }
  };

  const getModelDisplayName = (modelId: string) =>
    models.find(m => m.id === modelId)?.display_name || selectedModel?.display_name || 'Bangla AI';

  const suggestions = [
    'Write a TypeScript React hook for debounced search with AbortController',
    'Write a Python FastAPI endpoint with Pydantic validation and async error handling',
    'Draft a strategic B2B technology partnership proposal',
    'Compare PostgreSQL vs MongoDB trade-offs in a Markdown comparison table'
  ];

  return (
    <div className="flex flex-1 h-full w-full max-w-full overflow-hidden bg-white dark:bg-[#1F1F1F] transition-colors relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Sidebar (Slide-over on mobile, inline on desktop) */}
      <aside
        className={`${
          sidebarOpen
            ? 'translate-x-0 w-72 max-w-[82vw] md:w-72'
            : '-translate-x-full pointer-events-none md:pointer-events-auto w-72 md:w-0 md:translate-x-0 md:border-r-0'
        } fixed md:relative top-0 bottom-0 left-0 z-30 md:z-20 shrink-0 border-r border-black/[0.08] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#242424] flex flex-col transition-all duration-300 overflow-hidden`}
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

        {/* Footer info & quick navigation */}
        <div className="p-2.5 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  onNavigateHome();
                }}
                className="flex-1 h-8 px-2.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span>Overview</span>
              </button>
            )}
            {onNavigateAccount && (
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  onNavigateAccount();
                }}
                className="flex-1 h-8 px-2.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Account</span>
              </button>
            )}
            {user?.role === 'admin' && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  onNavigateAdmin();
                }}
                className="w-full h-8 px-2.5 rounded-[8px] bg-black text-white dark:bg-white dark:text-black flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
          <div className="px-1 text-[11px] font-mono text-gray-500 flex items-center justify-between">
            <span>Conversations:</span>
            <span className="font-semibold text-black dark:text-white">{chats.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Canvas (supports drag-and-drop file upload anywhere in workspace) */}
      <main
        onDragEnter={e => {
          e.preventDefault();
          workspaceDragCounterRef.current += 1;
          if (e.dataTransfer?.types?.includes('Files')) {
            setIsDraggingWorkspace(true);
          }
        }}
        onDragOver={e => {
          e.preventDefault();
        }}
        onDragLeave={e => {
          e.preventDefault();
          workspaceDragCounterRef.current = Math.max(0, workspaceDragCounterRef.current - 1);
          if (workspaceDragCounterRef.current === 0) {
            setIsDraggingWorkspace(false);
          }
        }}
        onDrop={e => {
          e.preventDefault();
          workspaceDragCounterRef.current = 0;
          setIsDraggingWorkspace(false);
          const files = Array.from(e.dataTransfer?.files || []);
          if (files.length > 0) {
            setDroppedFiles(files);
          }
        }}
        className="flex-1 min-w-0 w-full max-w-full flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#1F1F1F]"
      >
        {isDraggingWorkspace && (
          <div
            data-testid="workspace-drop-overlay"
            className="absolute inset-3 z-40 rounded-[16px] border-2 border-dashed border-black/50 dark:border-white/50 bg-white/90 dark:bg-[#1F1F1F]/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none"
          >
            <div className="w-12 h-12 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-black dark:text-white">
              Drop photos or files to attach
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WEBP, TXT, MD, CSV, JSON, JS, TS, PY, HTML, CSS
            </p>
          </div>
        )}
        {/* Compact Workspace Top Bar (Website Header hidden to maximize chat space) */}
        <div className="h-12 shrink-0 border-b border-black/[0.08] dark:border-white/[0.08] px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 bg-white/95 dark:bg-[#1F1F1F]/95 backdrop-blur-sm z-10 w-full max-w-full">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                aria-label="Back to Overview"
                title="Back to Bangla AI Overview"
                className="w-8 h-8 shrink-0 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
              </button>
            )}

            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="w-8 h-8 shrink-0 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Model Selector */}
            <div className="relative min-w-0 flex-1 sm:flex-initial max-w-full">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                aria-label={`Select AI model: ${selectedModel?.display_name || 'Select Model'}`}
                aria-expanded={modelDropdownOpen}
                className="max-w-full min-w-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-black/[0.12] dark:border-white/[0.15] hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#262626] text-xs font-medium text-black dark:text-white transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="font-semibold truncate">{selectedModel?.display_name || 'Select Model'}</span>
                {selectedModel?.badge && selectedModel.badge !== 'free' && (
                  <span className="hidden sm:inline-block shrink-0 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-gray-600 dark:text-gray-400">
                    {selectedModel.badge}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
              </button>

              {modelDropdownOpen && (
                <div
                  className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-13 sm:top-full sm:mt-1.5 sm:w-80 rounded-[10px] bg-white dark:bg-[#262626] border border-black/[0.12] dark:border-white/[0.15] shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  onClick={() => setModelDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[10px] uppercase font-mono text-gray-400 border-b border-black/[0.06] dark:border-white/[0.06]">
                    Frontier Foundation Models
                  </div>
                  <div className="max-h-72 sm:max-h-80 overflow-y-auto">
                    {models.map(m => (
                      <button
                        key={m.id}
                        type="button"
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

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleExportFullChat}
                aria-label="Export conversation as Markdown"
                title="Export conversation (.md)"
                className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:border-black/30 dark:hover:border-white/30 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Export Chat</span>
              </button>
            )}

            {user && (
              <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono tabular-nums shrink-0 px-1">
                <span className="text-gray-500 hidden sm:inline">Tokens:</span>
                <span className="font-semibold text-black dark:text-white">
                  {Math.max(0, (user.usage_limit || 0) - (user.current_usage || 0)).toLocaleString()}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
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
        <div className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 py-4 sm:py-6 space-y-5">
          {messages.length === 0 && !isStreaming ? (
            <div className="min-h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center py-4 sm:py-10 space-y-4 sm:space-y-6 w-full">
              <BrandLogo className="w-11 h-11 sm:w-12 sm:h-12 shadow-xs" />
              <div className="space-y-1.5 px-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">
                  Ready when you are.
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Powered by <span className="font-semibold text-black dark:text-white">{selectedModel?.display_name}</span>. Start a query below or select a prompt:
                </p>
              </div>

              {/* Suggestions Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-1">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="w-full p-3 sm:p-3.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#262626] text-xs text-gray-700 dark:text-gray-300 transition-all flex items-start justify-between gap-2.5 group cursor-pointer shadow-xs text-left"
                  >
                    <span className="leading-snug flex-1 min-w-0 break-words">{s}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 group-hover:text-black dark:group-hover:text-white transition-all shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full min-w-0 space-y-5">
              {messages.map((m, idx) => {
                const msgId = m.id || `msg-${idx}`;
                const modelLabel = getModelDisplayName(m.model_id);
                const stats = m.role === 'assistant' ? estimateReadingStats(m.content) : null;
                const feedbackVote = messageFeedback[msgId];

                return (
                  <div
                    key={msgId}
                    className={`flex gap-2.5 sm:gap-3 w-full min-w-0 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <BrandLogo className="hidden sm:block w-7 h-7 mt-0.5 shrink-0" />
                    )}

                    <div
                      className={`min-w-0 ${
                        m.role === 'user'
                          ? 'max-w-[90%] sm:max-w-[78%] flex flex-col items-end gap-1.5'
                          : 'w-full max-w-full sm:flex-1 sm:max-w-[92%] space-y-2'
                      }`}
                    >
                      <div
                        className={`w-full min-w-0 max-w-full overflow-hidden rounded-[12px] px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed break-words ${
                          m.role === 'user'
                            ? 'bg-black text-white dark:bg-white dark:text-black font-normal'
                            : 'bg-white dark:bg-[#262626] text-black dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-xs'
                        }`}
                      >
                        {m.role === 'user' ? (
                          <div className="space-y-2">
                            {m.attachments && m.attachments.length > 0 && (
                              <div
                                data-testid="user-message-attachments"
                                className="flex flex-wrap gap-2"
                              >
                                {m.attachments.map(att =>
                                  att.kind === 'image' && att.dataUrl ? (
                                    <div
                                      key={att.id}
                                      className="rounded-[10px] overflow-hidden border border-white/20 dark:border-black/15 bg-white/10 dark:bg-black/5 max-w-[210px]"
                                    >
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="min-w-[56px] min-h-[56px] max-h-44 w-auto object-cover block"
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      key={att.id}
                                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] border border-white/20 dark:border-black/15 bg-white/10 dark:bg-black/5 text-xs max-w-[230px]"
                                    >
                                      {/\.(js|ts|py|html|css|json)$/i.test(att.name) ? (
                                        <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                      )}
                                      <span className="truncate font-medium">{att.name}</span>
                                      <span className="text-[10px] opacity-70 font-mono shrink-0">
                                        {formatFileSize(att.size)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            {m.content && (
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                          </div>
                        ) : (
                          <FormattedMessage content={m.content} />
                        )}
                      </div>

                      {m.role === 'user' ? (
                        <button
                          type="button"
                          onClick={() => handleCopyResponse(msgId, m.content)}
                          aria-label="Copy prompt"
                          className="h-6 px-2 rounded-md text-[11px] text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedMessageId === msgId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div
                          data-testid="response-action-bar"
                          className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 px-1"
                        >
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyResponse(msgId, m.content)}
                              aria-label="Copy response"
                              className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                copiedMessageId === msgId
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                              }`}
                            >
                              {copiedMessageId === msgId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 shrink-0" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRegenerate(idx)}
                              disabled={isStreaming}
                              aria-label="Regenerate response"
                              className="h-7 px-2.5 rounded-md text-[11.5px] font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>Regenerate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSpeak(msgId, m.content)}
                              aria-label={speakingMessageId === msgId ? 'Stop reading aloud' : 'Listen to response'}
                              className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                speakingMessageId === msgId
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                              }`}
                            >
                              {speakingMessageId === msgId ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadResponse(msgId, m.content, modelLabel)}
                              aria-label="Download response as Markdown"
                              className="h-7 px-2.5 rounded-md text-[11.5px] font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Save .md</span>
                            </button>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-black/[0.08] dark:border-white/[0.08]">
                              <button
                                type="button"
                                onClick={() => handleToggleFeedback(msgId, 'up')}
                                aria-label="Mark response helpful"
                                aria-pressed={feedbackVote === 'up'}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  feedbackVote === 'up'
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                                    : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFeedback(msgId, 'down')}
                                aria-label="Mark response unhelpful"
                                aria-pressed={feedbackVote === 'down'}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  feedbackVote === 'down'
                                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50'
                                    : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 tabular-nums">
                            <span className="truncate max-w-[140px]">{modelLabel}</span>
                            {m.tokens_used > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{m.tokens_used.toLocaleString()} tok</span>
                              </>
                            )}
                            {stats && stats.words > 0 && (
                              <>
                                <span aria-hidden="true" className="hidden sm:inline">·</span>
                                <span className="hidden sm:inline">{stats.words}w</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex gap-2.5 sm:gap-3 justify-start w-full min-w-0 animate-in fade-in">
                  <BrandLogo className="hidden sm:block w-7 h-7 mt-0.5 shrink-0" />
                  <div className="w-full max-w-full sm:flex-1 sm:max-w-[92%] min-w-0 overflow-hidden rounded-[12px] px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-[#262626] text-black dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-xs break-words">
                    {streamedText ? (
                      <FormattedMessage content={streamedText} />
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
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

        {/* Expand-on-Focus Chat Composer */}
        <ChatComposer
          inputRef={inputRef}
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          attachments={pendingAttachments}
          onAddAttachments={newAtts => setPendingAttachments(prev => [...prev, ...newAtts])}
          onRemoveAttachment={id => setPendingAttachments(prev => prev.filter(a => a.id !== id))}
          onSubmit={() => handleSendMessage()}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
          isSubscribed={Boolean(isSubscribed)}
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          onOpenPaymentModal={() => openPaymentModal('monthly')}
          externalDroppedFiles={droppedFiles}
          onClearExternalDroppedFiles={() => setDroppedFiles(null)}
        />
      </main>
    </div>
  );
};
