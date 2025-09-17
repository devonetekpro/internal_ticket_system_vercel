
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Bot, User, Loader2, Mail, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { Label } from './ui/label';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type View = 'chat' | 'pre-escalation-form' | 'in-queue';

type Message = {
  id: string;
  sender: 'client' | 'ai' | 'agent';
  content: string;
  isEscalationSuggestion?: boolean;
};

// Extracted and Memoized ChatView Component
const ChatView = React.memo(function ChatView({ 
  messages, 
  isLoading, 
  handleSendMessage, 
  input, 
  setInput, 
  view,
  messagesEndRef,
  handleEscalationClick
}: { 
  messages: Message[], 
  isLoading: boolean, 
  handleSendMessage: (e: React.FormEvent, predefinedQuery?: string) => void, 
  input: string, 
  setInput: (value: string) => void,
  view: View,
  messagesEndRef: React.RefObject<HTMLDivElement>,
  handleEscalationClick: () => void,
}) {
  return (
    <>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex items-end gap-2',
              msg.sender === 'client' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.sender !== 'client' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><Bot /></AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-xs rounded-lg px-4 py-2 text-sm',
                msg.sender === 'client'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              {msg.isEscalationSuggestion && (
                <Button size="sm" className="mt-2" onClick={handleEscalationClick} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Speak to an agent"}
                </Button>
              )}
            </div>
              {msg.sender === 'client' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && !messages.some(m => m.isEscalationSuggestion) && (
            <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                <div className="max-w-xs rounded-lg px-4 py-2 text-sm bg-muted flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || view !== 'chat'}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || view !== 'chat'}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
});
ChatView.displayName = 'ChatView';


export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [view, setView] = useState<View>('chat');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const supabase = createClient();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect runs once on mount to set up client/chat IDs and load history.
    const initializeChat = async () => {
      let storedClientId = localStorage.getItem('helpflow-clientId');
      if (!storedClientId) {
        storedClientId = uuidv4();
        localStorage.setItem('helpflow-clientId', storedClientId);
      }
      setClientId(storedClientId);

      const storedChatId = localStorage.getItem('helpflow-chatId');
      if (storedChatId) {
        setChatId(storedChatId);
        setIsLoading(true);
        try {
          const response = await fetch(`/api/chat?chatId=${storedChatId}`);
          if (response.ok) {
            const historyMessages: Message[] = await response.json();
            if (historyMessages.length > 0) {
              setMessages(historyMessages);
            } else {
              // If history is empty for a known chat ID, something is wrong. Reset.
              localStorage.removeItem('helpflow-chatId');
              setChatId(null);
              setMessages([{ id: 'initial-greeting', sender: 'ai', content: "Hello! I'm your AI Assistant. How can I help you today?" }]);
            }
          } else {
            // If fetching history fails, assume the chat ID is stale and reset.
            localStorage.removeItem('helpflow-chatId');
            setChatId(null);
            setMessages([{ id: 'initial-greeting-error', sender: 'ai', content: "I couldn't load your previous session, but I'm here to help now!" }]);
          }
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
          setMessages([{ id: 'initial-greeting-error', sender: 'ai', content: "There was a problem connecting to the chat service." }]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // No chat ID found, so this is a new session.
        setMessages([{ id: 'initial-greeting', sender: 'ai', content: "Hello! I'm your AI Assistant. How can I help you today?" }]);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (chatId) {
        localStorage.setItem('helpflow-chatId', chatId);
    } else {
        localStorage.removeItem('helpflow-chatId');
    }
  }, [chatId]);

  useEffect(() => {
    const handleUnload = () => {
      if (chatId) {
        const payload = JSON.stringify({ chatId });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/chat', blob);
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`client-chat-room-${chatId}`)
      .on<ChatMessage>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_type !== 'client') {
            setMessages(currentMessages => {
                if (currentMessages.find(m => m.id === newMessage.id)) {
                    return currentMessages;
                }
                return [...currentMessages, {
                    id: newMessage.id,
                    sender: newMessage.sender_type as 'ai' | 'agent',
                    content: newMessage.content,
                }];
            });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, supabase]);

  const handleSendMessage = async (e: React.FormEvent, predefinedQuery?: string) => {
    e.preventDefault();
    const query = predefinedQuery || input;
    if (!query.trim()) return;
  
    const userMessage: Message = { id: uuidv4(), sender: 'client', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
  
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chatId, clientId }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server responded with an error');
      }

      if (!response.body) {
        throw new Error('No response body');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';
      
      const aiMessageId = uuidv4();
      let isHeaderParsed = false;
      let streamedContent = '';

      // Add a placeholder message for the AI response
      setMessages((prev) => [...prev, { id: aiMessageId, sender: 'ai', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        let chunk = decoder.decode(value, { stream: !done });
        
        if (!isHeaderParsed) {
          const headerEnd = chunk.indexOf('\n\n');
          if (headerEnd !== -1) {
            const headerStr = chunk.substring(0, headerEnd);
            try {
              const header = JSON.parse(headerStr);
              if (header.chatId) {
                setChatId(header.chatId);
              }
              chunk = chunk.substring(headerEnd + 2);
            } catch (e) {
                // Not a JSON header, treat as content
            } finally {
               isHeaderParsed = true; 
            }
          }
        }
  
        if (isHeaderParsed) {
          streamedContent += chunk;
          fullResponse += chunk; // Also accumulate the full response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: streamedContent }
                : msg
            )
          );
        }
      }
      
      // Final check after stream is complete
      if (fullResponse.trim() === "IDK") {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: "I'm sorry, I don't have the information to answer that. Would you like to speak to a human agent?", isEscalationSuggestion: true }
            : msg
        ));
      }
  
    } catch (error: any) {
      console.error('Failed to send message:', error);
       setMessages((prev) => [...prev, { 
            id: uuidv4(), 
            sender: 'ai', 
            content: `I'm having trouble connecting. Please try again in a moment. Error: ${error.message}` 
        }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEscalationClick = () => {
    setMessages(prev => prev.map(m => m.isEscalationSuggestion ? { ...m, isEscalationSuggestion: false } : m));
    setView('pre-escalation-form');
  }

  const handleStartLiveChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (!chatId) throw new Error("Chat ID is not available for escalation.");

        const { data, error } = await supabase
            .rpc('escalate_chat_to_agent', { p_chat_id: chatId, p_client_name: name, p_client_email: email });

        if (error) throw error;
        
        const queuePosition = data;

        const queuingMessage: Message = { 
            id: uuidv4(), 
            sender: 'ai', 
            content: `Thank you for your patience. You are currently number **${queuePosition}** in the queue. An agent will be with you as soon as possible.`
        };
        setMessages(prev => [...prev, queuingMessage]);
        setView('in-queue');

    } catch (error: any) {
        console.error("Failed to update chat status for escalation:", error);
         const errorMessage: Message = { 
          id: uuidv4(), 
          sender: 'ai', 
          content: "Sorry, I couldn't connect you to an agent. Please try again in a moment." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }

  const PreEscalationFormView = () => (
    <CardContent className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleStartLiveChat} className="space-y-4">
            <h4 className="font-semibold text-center">Enter your details to connect with an agent.</h4>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Start Live Chat"}
            </Button>
        </form>
    </CardContent>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 z-50"
          >
            <Card className="w-96 h-[32rem] flex flex-col shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-primary" />
                  <CardTitle>AI Assistant</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              {view === 'chat' || view === 'in-queue' ? (
                <ChatView 
                  messages={messages} 
                  isLoading={isLoading} 
                  handleSendMessage={handleSendMessage}
                  input={input}
                  setInput={setInput}
                  view={view}
                  messagesEndRef={messagesEndRef}
                  handleEscalationClick={handleEscalationClick}
                />
              ) : <PreEscalationFormView />}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.5,
          }}
        >
          <Button
            size="icon"
            className="w-16 h-16 rounded-full shadow-lg"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
          </Button>
        </motion.div>
      </div>
    </>
  );
}

// Add uuid package for client ID generation
// In a real project, this would be in package.json
declare module 'uuid' {
    export function v4(): string;
}
