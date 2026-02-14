// frontend/app/dashboard/sms-inbox/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { workspaces, api } from '@/lib/api';

interface SMSConversation {
  id: string;
  contact_name: string;
  telegram_chat_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface SMSMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
}

export default function SMSInboxPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [conversations, setConversations] = useState<SMSConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      
      // Load SMS conversations from localStorage (demo mode)
      loadConversationsFromStorage(ws.id);
    } catch (err) {
      setError('Failed to load SMS inbox');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationsFromStorage = (workspaceId: string) => {
    const storageKey = `sms_conversations_${workspaceId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const convs = JSON.parse(stored);
      setConversations(convs);
    }
  };

  const saveConversationsToStorage = (workspaceId: string, convs: SMSConversation[]) => {
    const storageKey = `sms_conversations_${workspaceId}`;
    localStorage.setItem(storageKey, JSON.stringify(convs));
  };

  const loadMessages = (conversationId: string) => {
    const storageKey = `sms_messages_${conversationId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setMessages(JSON.parse(stored));
    } else {
      setMessages([]);
    }
  };

  const saveMessages = (conversationId: string, msgs: SMSMessage[]) => {
    const storageKey = `sms_messages_${conversationId}`;
    localStorage.setItem(storageKey, JSON.stringify(msgs));
  };

  const handleCreateConversation = () => {
    if (!workspace || !newContactName || !newChatId) {
      setError('Please fill in all fields');
      return;
    }

    const newConv: SMSConversation = {
      id: `conv_${Date.now()}`,
      contact_name: newContactName,
      telegram_chat_id: newChatId,
      last_message: 'No messages yet',
      last_message_at: new Date().toISOString(),
      unread_count: 0
    };

    const updated = [...conversations, newConv];
    setConversations(updated);
    saveConversationsToStorage(workspace.id, updated);
    
    setNewContactName('');
    setNewChatId('');
    setShowNewConversation(false);
    setSuccessMsg('Conversation created!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !workspace) return;

    setSending(true);
    setError('');

    try {
      // Send via Telegram API
      const response = await api.post(`/api/sms/test?workspace_id=${workspace.id}`, {
        phone_or_chat_id: selectedConversation.telegram_chat_id,
        message: messageInput
      });

      if (response.data.success) {
        // Add to messages
        const newMessage: SMSMessage = {
          id: `msg_${Date.now()}`,
          conversation_id: selectedConversation.id,
          direction: 'outbound',
          content: messageInput,
          sent_at: new Date().toISOString(),
          status: 'delivered'
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        saveMessages(selectedConversation.id, updatedMessages);

        // Update conversation
        const updatedConvs = conversations.map(c => 
          c.id === selectedConversation.id 
            ? { ...c, last_message: messageInput, last_message_at: new Date().toISOString() }
            : c
        );
        setConversations(updatedConvs);
        saveConversationsToStorage(workspace.id, updatedConvs);

        setMessageInput('');
        setSuccessMsg('Message sent!');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        setError('Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message via Telegram');
    } finally {
      setSending(false);
    }
  };

  // Demo feature: Simulate incoming message (for hackathon video)
  const handleSimulateReply = () => {
    if (!selectedConversation) return;

    const demoReplies = [
      'Thanks for reaching out! I received your message.',
      'Yes, I can confirm my appointment for tomorrow.',
      'Could you please send me more details?',
      'Perfect, see you then!',
      'I appreciate the quick response!'
    ];

    const randomReply = demoReplies[Math.floor(Math.random() * demoReplies.length)];

    const incomingMessage: SMSMessage = {
      id: `msg_${Date.now()}`,
      conversation_id: selectedConversation.id,
      direction: 'inbound',
      content: randomReply,
      sent_at: new Date().toISOString(),
      status: 'delivered'
    };

    const updatedMessages = [...messages, incomingMessage];
    setMessages(updatedMessages);
    saveMessages(selectedConversation.id, updatedMessages);

    // Update conversation
    const updatedConvs = conversations.map(c => 
      c.id === selectedConversation.id 
        ? { ...c, last_message: randomReply, last_message_at: new Date().toISOString(), unread_count: c.unread_count + 1 }
        : c
    );
    setConversations(updatedConvs);
    saveConversationsToStorage(workspace!.id, updatedConvs);

    setSuccessMsg('Customer replied! (Demo simulation)');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">SMS Inbox</h2>
          <p className="text-sm text-slate-500 mt-0.5">Send and receive SMS via Telegram</p>
        </div>
        <button
          onClick={() => setShowNewConversation(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Conversations ({conversations.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">No conversations yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "New Conversation" to start</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv);
                      // Mark as read
                      const updated = conversations.map(c => 
                        c.id === conv.id ? { ...c, unread_count: 0 } : c
                      );
                      setConversations(updated);
                      saveConversationsToStorage(workspace!.id, updated);
                    }}
                    className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-800">{conv.contact_name}</p>
                      {conv.unread_count > 0 && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(conv.last_message_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Conversation Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{selectedConversation.contact_name}</h3>
                  <p className="text-xs text-slate-500">Chat ID: {selectedConversation.telegram_chat_id}</p>
                </div>
                {/* Demo Button for Hackathon Video */}
                <button
                  onClick={handleSimulateReply}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Simulate Customer Reply (Demo)
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
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
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md lg:max-w-lg`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              msg.direction === 'outbound'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-2 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-slate-400">
                              {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.direction === 'outbound' && (
                              <span className={`text-xs ${
                                msg.status === 'delivered' ? 'text-green-500' :
                                msg.status === 'sent' ? 'text-slate-400' :
                                'text-red-500'
                              }`}>
                                {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-slate-100 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message... (Enter to send)"
                      rows={2}
                      className="w-full px-4 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0 shadow-sm"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 Messages will be sent via Telegram to {selectedConversation.contact_name}
                </p>
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
                Choose a conversation from the left to view messages and send SMS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewConversation(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">New SMS Conversation</h3>
              <button onClick={() => setShowNewConversation(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telegram Chat ID *</label>
                <input
                  type="text"
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456789"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get chat ID from: api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={!newContactName || !newChatId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}