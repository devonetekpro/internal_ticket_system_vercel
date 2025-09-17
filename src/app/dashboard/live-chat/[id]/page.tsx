
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notFound, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Bot, User, Send, Loader2, UserCheck, Link as LinkIcon, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Database } from '@/lib/database.types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { assignAgentToChat, sendAgentMessage, closeChat } from './_actions/chat-actions';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


type Profile = Database['public']['Tables']['profiles']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type Chat = Database['public']['Tables']['chats']['Row'] & {
  profiles: Pick<Profile, 'full_name' | 'username' | 'avatar_url'> | null;
};

const statusColors: { [key: string]: string } = {
  active: 'bg-green-500/20 text-green-400 border-green-500/50',
  resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  escalated: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
};

const ChatSkeleton = () => (
  <main className="flex-1 flex flex-col h-full">
    <div className="border-b p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex items-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-10 w-48 rounded-lg" /></div>
      <div className="flex items-end gap-2 justify-end"><Skeleton className="h-10 w-56 rounded-lg" /><Skeleton className="h-8 w-8 rounded-full" /></div>
      <div className="flex items-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-12 w-64 rounded-lg" /></div>
    </div>
    <div className="border-t p-4">
      <Skeleton className="h-10 w-full" />
    </div>
  </main>
);

export default function AgentChatPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return router.push('/login');
      }
      setCurrentUserId(user.id);

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*, profiles (full_name, username, avatar_url)')
        .eq('id', params.id)
        .single();
      
      if (chatError || !chatData) {
        return notFound();
      }
      setChat(chatData as Chat);

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', params.id)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        toast.error('Failed to load messages.');
      } else {
        setMessages(messagesData);
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [params.id, supabase, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-room-${params.id}`)
      .on<ChatMessage>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${params.id}`
      }, (payload) => {
        setMessages(currentMessages => {
          if (currentMessages.find(m => m.id === payload.new.id)) {
            return currentMessages;
          }
          return [...currentMessages, payload.new as ChatMessage];
        });
      })
      .on<Chat>('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${params.id}`
      }, async (payload) => {
        const updatedChatData = payload.new;
        
        let newProfile: Profile | null = chat?.profiles ?? null;
        
        // If a new agent was assigned, fetch their profile
        if (updatedChatData.assigned_agent_id && updatedChatData.assigned_agent_id !== chat?.assigned_agent_id) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', updatedChatData.assigned_agent_id)
                .single();
            newProfile = profileData as any;
        }

        setChat(currentChat => {
            if (!currentChat) return null;
            return {
                ...currentChat,
                ...updatedChatData,
                profiles: newProfile ?? currentChat.profiles,
            };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, supabase, chat]);

  const handleTakeover = async () => {
    if (!chat) return;
    setIsTakingOver(true);
    const result = await assignAgentToChat(chat.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsTakingOver(false);
  };
  
  const handleSendMessage = async (formData: FormData) => {
    setIsSending(true);
    await sendAgentMessage(formData);
    formRef.current?.reset();
    setIsSending(false);
  }

  const handleCloseChat = async () => {
    if (!chat) return;
    setIsClosing(true);
    const result = await closeChat(chat.id);
    if (result.success) {
        toast.success(result.message);
    } else {
        toast.error(result.message);
    }
    setIsClosing(false);
  }

  if (loading) {
    return <ChatSkeleton />;
  }

  if (!chat) {
    return notFound();
  }

  const isAssignedToCurrentUser = chat.assigned_agent_id === currentUserId;
  const isAssigned = !!chat.assigned_agent_id;
  const agentName = chat.profiles?.full_name ?? chat.profiles?.username ?? 'Unassigned';
  const isChatClosed = chat.status === 'resolved' || chat.status === 'escalated';

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh_-_var(--header-height))] bg-muted/30">
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/live-chat">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h2 className="font-bold text-lg">Chat with Client #{chat.client_id.substring(0, 8)}</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>Last updated: {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}</span>
                    <Badge variant="outline" className={cn('capitalize', statusColors[chat.status] ?? '')}>
                        {chat.status}
                    </Badge>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {isAssigned ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                   <UserCheck className="h-4 w-4 text-primary"/>
                   Assigned to: <span className="font-semibold text-foreground">{isAssignedToCurrentUser ? 'You' : agentName}</span>
                </div>
            ) : !isChatClosed && (
                <Button onClick={handleTakeover} disabled={isTakingOver}>
                    {isTakingOver ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                    Take Over Chat
                </Button>
            )}
             {chat.linked_ticket_id && (
                <Button asChild variant="outline">
                    <Link href={`/dashboard/tickets/${chat.linked_ticket_id}`}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        View Linked Ticket
                    </Link>
                </Button>
            )}
            {!chat.linked_ticket_id && isAssignedToCurrentUser && !isChatClosed && (
                <Button variant="secondary">
                     <LinkIcon className="mr-2 h-4 w-4" />
                    Escalate to Ticket
                </Button>
            )}
            {isAssignedToCurrentUser && !isChatClosed && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isClosing}>
                            {isClosing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <XCircle className="mr-2 h-4 w-4" />
                            Close Chat
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will end the chat session for both you and the client. This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseChat} className="bg-destructive hover:bg-destructive/90">
                            Confirm Close
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
                key={msg.id}
                className={cn(
                'flex items-end gap-3',
                msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                )}
            >
                {msg.sender_type !== 'agent' && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>
                        {msg.sender_type === 'client' ? <User /> : <Bot />}
                    </AvatarFallback>
                </Avatar>
                )}
                <div
                    className={cn(
                        'max-w-md rounded-lg px-4 py-2 text-sm break-words',
                        msg.sender_type === 'agent'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background',
                        (msg.content === 'An agent has joined the chat.' || msg.content === 'The agent has ended the chat.') 
                        && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 w-full text-center italic'
                    )}
                >
                    <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                </div>
                {msg.sender_type === 'agent' && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={chat.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback>{getInitials(agentName, '')}</AvatarFallback>
                    </Avatar>
                )}
            </div>
          ))}
          <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-background p-4">
        {isAssignedToCurrentUser && !isChatClosed ? (
             <form ref={formRef} action={handleSendMessage} className="flex w-full items-center gap-2">
                  <Input name="content" placeholder="Type your message..." autoComplete="off" disabled={isSending}/>
                  <Input type="hidden" name="chatId" value={chat.id} />
                  <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="h-4 w-4" />
                  </Button>
            </form>
        ) : (
            <div className="flex items-center justify-center text-sm text-muted-foreground p-2 bg-muted rounded-md gap-2">
                <AlertTriangle className="h-4 w-4" />
                {isChatClosed ? 'This chat has been closed.' : (isAssigned ? `This chat is being handled by ${agentName}.` : 'You must take over this chat to send messages.')}
            </div>
        )}
      </div>
    </main>
  );
}
