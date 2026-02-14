'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { workspaces, conversations } from '@/lib/api';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'contact' | 'staff' | 'automation';
  content: string;
  channel: string;
  is_automated: boolean;
  sent_at: string;
}

interface Conversation {
  id: string;
  workspace_id: string;
  contact_id: string;
  status: 'open' | 'closed';
  last_message_at: string;
  automation_paused: boolean;
  created_at: string;
  contact?: { name: string; email: string };
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatMsgTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function InboxPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [convList, setConvList] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWorkspaceAndConvs();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      startPolling(selectedConv.id);
    }
    return () => stopPolling();
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadWorkspaceAndConvs = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      await loadConversations(ws.id);
    } catch {
      setError('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadConversations = async (wsId: string) => {
    try {
      const data = await conversations.list(wsId);
      setConvList(data);
    } catch {
      setError('Failed to load conversations');
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await conversations.getMessages(convId);
      setMessages(data);
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  };

  const startPolling = useCallback((convId: string) => {
    stopPolling();
    pollRef.current = setInterval(() => {
      conversations.getMessages(convId).then(setMessages).catch(() => {});
    }, 5000);
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConv || sending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);
    try {
      const newMsg = await conversations.sendMessage(selectedConv.id, content);
      setMessages(prev => [...prev, newMsg]);
    } catch {
      setError('Failed to send message');
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getContactName = (conv: Conversation) =>
    conv.contact?.name || 'Unknown Contact';

  const getContactInitial = (conv: Conversation) =>
    (conv.contact?.name || 'U')[0].toUpperCase();

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50">
      {/* Conversation List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Conversations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {convList.filter(c => c.status === 'open').length} open
          </p>
        </div>

        {loadingConvs ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : convList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No conversations yet</p>
            <p className="text-xs text-slate-400 mt-1">Messages will appear here</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {convList.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full flex items-start gap-3 p-4 border-b border-slate-50 text-left transition-colors
                  ${selectedConv?.id === conv.id
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : 'hover:bg-slate-50'
                  }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${conv.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {getContactInitial(conv)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 truncate">{getContactName(conv)}</p>
                    <span className="text-xs text-slate-400 ml-1 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${conv.status === 'open' ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <p className="text-xs text-slate-400 truncate capitalize">{conv.status}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Panel */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                {getContactInitial(selectedConv)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{getContactName(selectedConv)}</p>
                <p className="text-xs text-slate-400">{selectedConv.contact?.email || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
                ${selectedConv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${selectedConv.status === 'open' ? 'bg-green-500' : 'bg-slate-400'}`} />
                {selectedConv.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500">No messages yet</p>
                <p className="text-xs text-slate-400 mt-1">Start the conversation below</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isStaff = msg.sender_type === 'staff' || msg.sender_type === 'automation';
                  return (
                    <div key={msg.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm lg:max-w-md xl:max-w-lg`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${isStaff
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm'
                          }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isStaff ? 'justify-end' : 'justify-start'}`}>
                          {msg.is_automated && (
                            <span className="text-xs text-slate-400">🤖 Auto ·</span>
                          )}
                          <span className="text-xs text-slate-400">{formatMsgTime(msg.sent_at)}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400 capitalize">{msg.channel}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 bg-white p-4">
            {error && (
              <div className="mb-2 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send)"
                  rows={2}
                  className="w-full px-4 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-xs text-slate-400">Email · ⏎ Send</span>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!messageInput.trim() || sending}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a conversation</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            Choose a conversation from the left to view messages and reply
          </p>
        </div>
      )}
    </div>
  );
}