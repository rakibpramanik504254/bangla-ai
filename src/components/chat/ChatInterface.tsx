import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  ChevronDown,
  Lock,
  Copy,
  PanelLeftOpen,
  Menu,
  SquarePen,
  ArrowUpRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  ThumbsUp,
  ThumbsDown,
  FileText,
  FileCode2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Chat, Message, AiModel, ChatAttachment } from '../../types/index.ts';
import { createSseLineParser, parseChatStreamPayload } from '../../utils/sse.ts';
import {
  parseMarkdownBlocks,
  parseInlineSegments,
  estimateReadingStats,
} from '../../utils/markdownBlocks.ts';
import { WorkspaceCodeBlock } from './WorkspaceCodeBlock.tsx';
import { ChatComposer } from './ChatComposer.tsx';
import { WorkspaceSidebar } from './WorkspaceSidebar.tsx';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal.tsx';
import { WorkspaceModelIcon } from './WorkspaceModelIcon.tsx';
import { formatFileSize } from '../../utils/chatAttachments.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';
import { formatCompactTokens } from '../../utils/workspaceSidebar.ts';
import { BrandLogo } from '../common/BrandLogo.tsx';

function renderInlineSegments(text: string): React.ReactNode {
  const segments = parseInlineSegments(text);
  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'code':
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.09] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-[12.5px] break-all"
          >
            {seg.value}
          </code>
        );
      case 'bold':
        return (
          <strong key={i} className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            {seg.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={i} className="italic text-[#444746] dark:text-[#c4c7c5]">
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
            className="underline decoration-black/30 dark:decoration-white/35 hover:text-black dark:hover:text-white font-medium"
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
    <div className="workspace-prose space-y-3.5 text-[15px] text-[#1f1f1f] dark:text-[#e3e3e3] min-w-0 max-w-full break-words">
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
            1: 'text-xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] pt-2 tracking-tight',
            2: 'text-lg font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] pt-2 tracking-tight',
            3: 'text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] pt-1.5',
            4: 'text-[15px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] pt-1',
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
              className="rounded-xl bg-[#f0f4f9] dark:bg-[#1e1f20] border-l-2 border-black/25 dark:border-white/25 px-4 py-3 text-[#444746] dark:text-[#c4c7c5] italic space-y-1.5"
            >
              {block.lines.map((qLine, qIdx) => (
                <p key={qIdx}>{renderInlineSegments(qLine)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'hr') {
          return (
            <hr
              key={index}
              className="border-black/[0.08] dark:border-white/[0.08] my-3"
            />
          );
        }

        if (block.type === 'list') {
          return (
            <div key={index} className="space-y-2 pl-1">
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-2.5 min-w-0">
                  {block.ordered ? (
                    <span className="text-[13px] font-mono font-medium text-[#444746] dark:text-[#9aa0a6] mt-0.5 shrink-0 tabular-nums">
                      {itemIdx + 1}.
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#444746]/70 dark:bg-[#9aa0a6]/80 mt-[10px] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
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
              className="my-2 overflow-x-auto max-w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08]"
            >
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-[#f0f4f9] dark:bg-[#1e1f20] border-b border-black/[0.08] dark:border-white/[0.08]">
                  <tr>
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] whitespace-nowrap"
                      >
                        {renderInlineSegments(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 text-[#1f1f1f]/90 dark:text-[#e3e3e3]/90 align-top"
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
          <p
            key={index}
            className="text-[#1f1f1f] dark:text-[#e3e3e3] whitespace-pre-wrap break-words"
          >
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
  onNavigateAdmin,
}) => {
  const { user, token, refreshUser, openPaymentModal } = useAuth();
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
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const workspaceDragCounterRef = useRef(0);
  const headerModelMenuRef = useRef<HTMLDivElement>(null);

  const isSubscribed = Boolean(user?.isSubscribed || user?.role === 'admin');

  useEffect(() => {
    fetch('/api/models', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
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

  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        headerModelMenuRef.current &&
        !headerModelMenuRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [modelDropdownOpen]);

  const fetchChats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
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
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'New Conversation',
          modelId: selectedModelId,
        }),
      });
      if (res.ok) {
        const newChat = await res.json();
        setChats((prev) => [newChat, ...prev]);
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

  const handleDeleteChat = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (activeChatId === id) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSaveRename = async (id: string, newTitle: string) => {
    if (!token || !newTitle.trim()) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c))
        );
      }
    } catch (err) {
      console.error('Rename chat error:', err);
    }
  };

  const handleTogglePinChat = async (id: string, nextPinned: boolean) => {
    if (!token) return;
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: nextPinned } : c))
    );
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      if (!res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, pinned: !nextPinned } : c))
        );
      }
    } catch (err) {
      console.error('Pin chat error:', err);
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: !nextPinned } : c))
      );
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (
      customPrompt !== undefined ? customPrompt : inputMessage
    ).trim();
    const attachmentsToSend =
      customPrompt !== undefined ? [] : pendingAttachments;
    if ((!textToSend && attachmentsToSend.length === 0) || isStreaming) return;

    if (!isSubscribed) {
      openPaymentModal('monthly');
      return;
    }

    let targetChatId = activeChatId;
    if (!targetChatId) {
      if (!token) return;
      try {
        const titleSeed =
          textToSend || attachmentsToSend[0]?.name || 'New Conversation';
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: titleSeed.slice(0, 34) + (titleSeed.length > 34 ? '...' : ''),
            modelId: selectedModelId,
          }),
        });
        if (res.ok) {
          const newChat = await res.json();
          setChats((prev) => [newChat, ...prev]);
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
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: targetChatId,
          modelId: selectedModelId,
          message: textToSend,
          attachments: attachmentsToSend,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error || 'Failed to stream response from foundation model.'
        );
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
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, finalMsg]);
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
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, partialMsg]);
        }
        setStreamedText('');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            chat_id: targetChatId!,
            role: 'assistant',
            content: `⚠️ Error: ${err.message}`,
            model_id: selectedModelId,
            tokens_used: 0,
            created_at: new Date().toISOString(),
          },
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

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleCopyResponse = async (msgId: string, content: string) => {
    await copyTextSafely(content);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId((prev) => (prev === msgId ? null : prev));
    }, 1800);
  };

  const handleDownloadResponse = (
    msgId: string,
    content: string,
    modelLabel: string
  ) => {
    const header = `<!-- Generated via Bangla AI (${modelLabel}) -->\n\n`;
    const blob = new Blob([header + content], {
      type: 'text/markdown;charset=utf-8',
    });
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
    const activeChat = chats.find((c) => c.id === activeChatId);
    const lines = [
      `# ${activeChat?.title || 'Bangla AI Conversation'}`,
      '',
      ...messages.map((m) => {
        const speaker =
          m.role === 'user'
            ? 'User'
            : `Assistant (${getModelDisplayName(m.model_id)})`;
        return `## ${speaker}\n\n${m.content}\n`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/markdown;charset=utf-8',
    });
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
    utterance.onend = () =>
      setSpeakingMessageId((prev) => (prev === msgId ? null : prev));
    utterance.onerror = () =>
      setSpeakingMessageId((prev) => (prev === msgId ? null : prev));
    setSpeakingMessageId(msgId);
    synth.speak(utterance);
  };

  const handleToggleFeedback = (msgId: string, vote: 'up' | 'down') => {
    setMessageFeedback((prev) => {
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

  const getModelById = (modelId: string) =>
    models.find((m) => m.id === modelId) || selectedModel;

  const getModelDisplayName = (modelId: string) =>
    getModelById(modelId)?.display_name || 'Bangla AI';

  const remainingTokens = Math.max(
    0,
    (user?.usage_limit || 0) - (user?.current_usage || 0)
  );

  const suggestions = [
    {
      label: 'Code Architecture',
      prompt: 'Write a TypeScript React hook for debounced search with AbortController',
    },
    {
      label: 'বাংলা লেখা ও বিশ্লেষণ',
      prompt: 'বাংলাদেশের প্রযুক্তিনির্ভর স্টার্টআপ ইকোসিস্টেম নিয়ে একটি সুসংগঠিত প্রবন্ধ লিখে দাও',
    },
    {
      label: 'Backend Engineering',
      prompt: 'Write a Python FastAPI endpoint with Pydantic validation and async error handling',
    },
    {
      label: 'Technical Comparison',
      prompt: 'Compare PostgreSQL vs MongoDB trade-offs in a Markdown comparison table',
    },
  ];

  return (
    <div className="workspace-typography flex flex-1 h-full w-full max-w-full overflow-hidden bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors relative">
      {/* Left Collapsible Sidebar / Mobile Drawer */}
      <WorkspaceSidebar
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onCreateNewChat={handleCreateNewChat}
        onTogglePinChat={handleTogglePinChat}
        onSaveRenameChat={handleSaveRename}
        onDeleteChat={handleDeleteChat}
        user={user}
        isSubscribed={isSubscribed}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onNavigateHome={onNavigateHome}
      />

      {/* Customer Account & Settings Modal (Houses Dark/Light Appearance Switcher) */}
      <WorkspaceSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onNavigateHome={onNavigateHome}
        onNavigateAccount={onNavigateAccount}
        onNavigateAdmin={onNavigateAdmin}
      />

      {/* Main Editorial Chat Canvas */}
      <main
        onDragEnter={(e) => {
          e.preventDefault();
          workspaceDragCounterRef.current += 1;
          if (e.dataTransfer?.types?.includes('Files')) {
            setIsDraggingWorkspace(true);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          workspaceDragCounterRef.current = Math.max(
            0,
            workspaceDragCounterRef.current - 1
          );
          if (workspaceDragCounterRef.current === 0) {
            setIsDraggingWorkspace(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          workspaceDragCounterRef.current = 0;
          setIsDraggingWorkspace(false);
          const files = Array.from(e.dataTransfer?.files || []);
          if (files.length > 0) {
            setDroppedFiles(files);
          }
        }}
        className="flex-1 min-w-0 w-full max-w-full flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#131314]"
      >
        {isDraggingWorkspace && (
          <div
            data-testid="workspace-drop-overlay"
            className="absolute inset-4 z-40 rounded-3xl border-2 border-dashed border-black/35 dark:border-white/35 bg-white/90 dark:bg-[#131314]/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none"
          >
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Drop photos or files to attach
            </p>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6]">
              PNG, JPG, WEBP, TXT, MD, CSV, JSON, JS, TS, PY, HTML, CSS
            </p>
          </div>
        )}

        {/* Minimalist Workspace Top Header (No Theme Toggle Button Here) */}
        <header
          data-testid="workspace-top-bar"
          className="h-14 shrink-0 px-2.5 sm:px-5 flex items-center justify-between gap-1.5 sm:gap-2 bg-white/90 dark:bg-[#131314]/90 backdrop-blur-md z-10 w-full max-w-full"
        >
          {/* Left: Mobile Drawer Trigger / Desktop Expand Trigger + Model Selector */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 md:hidden shrink-0 rounded-full flex items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Expand sidebar"
                className="hidden md:flex w-9 h-9 shrink-0 rounded-full items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Clean Model Selector Pill */}
            <div
              ref={headerModelMenuRef}
              className="relative min-w-0 max-w-full"
            >
              <button
                type="button"
                onClick={() => setModelDropdownOpen((prev) => !prev)}
                aria-label={`Select AI model: ${selectedModel?.display_name || 'Select Model'}`}
                aria-expanded={modelDropdownOpen}
                className="max-w-full min-w-0 h-9 px-2 sm:px-3 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] text-[13px] sm:text-[13.5px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
              >
                <WorkspaceModelIcon model={selectedModel} sizeClass="w-4 h-4" />
                <span className="truncate font-semibold tracking-tight">
                  {selectedModel?.display_name || 'Select Model'}
                </span>
                {selectedModel?.badge && selectedModel.badge !== 'free' && (
                  <span className="hidden sm:inline-block shrink-0 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6]">
                    {selectedModel.badge}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
              </button>

              {modelDropdownOpen && (
                <div
                  className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-auto top-14 sm:top-full sm:mt-1.5 sm:w-80 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.1] shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  onClick={() => setModelDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] border-b border-black/[0.06] dark:border-white/[0.08]">
                    Foundation Models
                  </div>
                  <div className="max-h-72 sm:max-h-80 overflow-y-auto py-1">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModelId(m.id)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                          selectedModelId === m.id
                            ? 'bg-[#f0f4f9] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-medium'
                            : 'text-[#444746] dark:text-[#c4c7c5]'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <WorkspaceModelIcon model={m} sizeClass="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate text-[#1f1f1f] dark:text-[#e3e3e3]">
                              {m.display_name}
                            </span>
                            {selectedModelId === m.id && (
                              <Check className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#444746]/80 dark:text-[#9aa0a6] line-clamp-1 mt-0.5 font-normal">
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

          {/* Right: Subtle Utility Actions (Export, Quota, Mobile New Chat) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleExportFullChat}
                aria-label="Export conversation as Markdown"
                title="Export conversation (.md)"
                className="h-8 w-8 sm:w-auto sm:px-3 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] text-[12px] font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {user && (
              <div
                title={`${remainingTokens.toLocaleString()} tokens remaining`}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] text-[11.5px] font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6] shrink-0"
              >
                <span>{formatCompactTokens(remainingTokens)}</span>
                <span className="text-[10.5px]">tokens</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateNewChat}
              aria-label="New chat"
              title="New chat"
              className="w-9 h-9 md:hidden rounded-full flex items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            >
              <SquarePen className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        {/* Subscription Gating Banner (Unpaid Users) */}
        {!isSubscribed && (
          <div className="mx-3 sm:mx-6 mt-1 mb-2 rounded-2xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs z-10">
            <div className="flex items-center gap-2 min-w-0 text-[#1f1f1f] dark:text-[#e3e3e3]">
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Subscription Required:</strong> Activate a plan to chat with frontier AI models.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openPaymentModal('monthly')}
              className="h-8 px-4 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 w-full sm:w-auto"
            >
              Subscribe (৳699/mo)
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-3 pb-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="min-h-full flex flex-col items-center justify-center max-w-[720px] mx-auto text-center py-6 sm:py-12 space-y-6 w-full">
              <div className="space-y-2.5 px-2">
                <div className="inline-flex items-center justify-center mb-1">
                  <BrandLogo className="w-11 h-11 shadow-xs" />
                </div>
                <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-tight">
                  Ready when you are.
                </h1>
                <p className="workspace-prose text-sm text-[#444746] dark:text-[#9aa0a6] max-w-md mx-auto">
                  Ask anything in <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">বাংলা</span> or English with{' '}
                  <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {selectedModel?.display_name || 'Bangla-AI.pro'}
                  </span>
                </p>
              </div>

              {/* Clean 2x2 Prompt Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s.prompt)}
                    className="w-full p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#f0f4f9]/70 hover:bg-[#e9eef6] dark:bg-[#1e1f20] dark:hover:bg-[#282a2c] transition-colors flex flex-col justify-between gap-2 group cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                        {s.label}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                    </div>
                    <span className="workspace-prose text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] line-clamp-2">
                      {s.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[780px] mx-auto w-full min-w-0 space-y-7 pt-2">
              {messages.map((m, idx) => {
                const msgId = m.id || `msg-${idx}`;
                const msgModel = getModelById(m.model_id);
                const modelLabel = msgModel?.display_name || 'Bangla AI';
                const stats =
                  m.role === 'assistant' ? estimateReadingStats(m.content) : null;
                const feedbackVote = messageFeedback[msgId];

                if (m.role === 'user') {
                  return (
                    <div
                      key={msgId}
                      className="flex justify-end w-full min-w-0 group"
                    >
                      <div className="max-w-[88%] sm:max-w-[76%] flex flex-col items-end gap-1.5 min-w-0">
                        <div className="rounded-3xl rounded-br-md px-5 py-3.5 bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] workspace-prose text-[15px] min-w-0 max-w-full break-words">
                          <div className="space-y-2.5">
                            {m.attachments && m.attachments.length > 0 && (
                              <div
                                data-testid="user-message-attachments"
                                className="flex flex-wrap gap-2"
                              >
                                {m.attachments.map((att) =>
                                  att.kind === 'image' && att.dataUrl ? (
                                    <div
                                      key={att.id}
                                      className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1e1f20] max-w-[220px]"
                                    >
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="min-w-[56px] min-h-[56px] max-h-48 w-auto object-cover block"
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      key={att.id}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white/70 dark:bg-[#1e1f20] text-xs max-w-[230px]"
                                    >
                                      {/\.(js|ts|py|html|css|json)$/i.test(
                                        att.name
                                      ) ? (
                                        <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                      )}
                                      <span className="truncate font-medium">
                                        {att.name}
                                      </span>
                                      <span className="text-[10px] opacity-70 font-mono shrink-0">
                                        {formatFileSize(att.size)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            {m.content && (
                              <p className="whitespace-pre-wrap break-words">
                                {m.content}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyResponse(msgId, m.content)}
                          aria-label="Copy prompt"
                          className="h-6 px-2 rounded-md text-[11px] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedMessageId === msgId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Copied
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                // Assistant Editorial Unboxed Message
                return (
                  <div
                    key={msgId}
                    className="flex gap-3 sm:gap-3.5 justify-start w-full min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <WorkspaceModelIcon model={msgModel} sizeClass="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-center gap-2 text-[12px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                        <span>{modelLabel}</span>
                      </div>

                      <FormattedMessage content={m.content} />

                      {/* Subtle Editorial Action Row */}
                      <div
                        data-testid="response-action-bar"
                        className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 pt-0.5"
                      >
                        <div className="flex flex-wrap items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopyResponse(msgId, m.content)}
                            aria-label="Copy response"
                            className={`h-7 px-2 rounded-lg text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              copiedMessageId === msgId
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
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
                            className="h-7 px-2 rounded-lg text-[11.5px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Regenerate</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msgId, m.content)}
                            aria-label={
                              speakingMessageId === msgId
                                ? 'Stop reading aloud'
                                : 'Listen to response'
                            }
                            className={`h-7 px-2 rounded-lg text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              speakingMessageId === msgId
                                ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                                : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
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
                                <span className="hidden sm:inline">Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadResponse(msgId, m.content, modelLabel)
                            }
                            aria-label="Download response as Markdown"
                            className="h-7 px-2 rounded-lg text-[11.5px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Save</span>
                          </button>

                          <div className="flex items-center gap-0.5 pl-1 ml-0.5 border-l border-black/[0.08] dark:border-white/[0.08]">
                            <button
                              type="button"
                              onClick={() => handleToggleFeedback(msgId, 'up')}
                              aria-label="Mark response helpful"
                              aria-pressed={feedbackVote === 'up'}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                feedbackVote === 'up'
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'text-[#444746]/80 dark:text-[#9aa0a6]/80 hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFeedback(msgId, 'down')}
                              aria-label="Mark response unhelpful"
                              aria-pressed={feedbackVote === 'down'}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                feedbackVote === 'down'
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                                  : 'text-[#444746]/80 dark:text-[#9aa0a6]/80 hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#444746]/75 dark:text-[#9aa0a6]/75 tabular-nums">
                          {m.tokens_used > 0 && (
                            <span>{m.tokens_used.toLocaleString()} tok</span>
                          )}
                          {m.tokens_used > 0 && stats && stats.words > 0 && (
                            <span aria-hidden="true">·</span>
                          )}
                          {stats && stats.words > 0 && (
                            <span>{stats.words}w</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex gap-3 sm:gap-3.5 justify-start w-full min-w-0 animate-in fade-in">
                  <div className="w-7 h-7 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <WorkspaceModelIcon model={selectedModel} sizeClass="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                      <span>{selectedModel?.display_name || 'Bangla AI'}</span>
                    </div>
                    {streamedText ? (
                      <FormattedMessage content={streamedText} />
                    ) : (
                      <div className="flex items-center gap-2 text-[13px] text-[#444746] dark:text-[#9aa0a6] py-1">
                        <span className="w-2 h-2 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] animate-pulse" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Pill Chat Composer */}
        <ChatComposer
          inputRef={inputRef}
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          attachments={pendingAttachments}
          onAddAttachments={(newAtts) =>
            setPendingAttachments((prev) => [...prev, ...newAtts])
          }
          onRemoveAttachment={(id) =>
            setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
          }
          onSubmit={() => handleSendMessage()}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
          isSubscribed={isSubscribed}
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
