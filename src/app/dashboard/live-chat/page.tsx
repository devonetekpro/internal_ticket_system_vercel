

'use client';

import { createClient } from '@/lib/supabase/client';
import { redirect, useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleHeart, ArrowRight, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Database } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/components/providers/permissions-provider';

const statusColors: { [key: string]: string } = {
  active: 'bg-green-500/20 text-green-400 border-green-500/50',
  resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  escalated: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
};

type ChatWithProfile = Database['public']['Tables']['chats']['Row'] & {
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
};

const ChatTableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

const ChatTable = ({ chats, loading }: { chats: ChatWithProfile[], loading: boolean }) => {
    if (loading) {
        return <ChatTableSkeleton />;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Agent</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {chats.length > 0 ? (
                    chats.map((chat) => (
                    <TableRow key={chat.id}>
                        <TableCell className="font-mono text-xs">{chat.client_id.substring(0, 18)}...</TableCell>
                        <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusColors[chat.status] ?? ''}`}>
                            {chat.status}
                        </Badge>
                        </TableCell>
                        <TableCell>
                        {chat.profiles ? (chat.profiles.full_name ?? chat.profiles.username) : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                        {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/live-chat/${chat.id}`}>
                            {chat.status === 'active' ? 'Join Chat' : 'View History'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No chats in this view.
                    </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};

const CHAT_POLL_INTERVAL = 30 * 1000; // 30 seconds

export default function LiveChatDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const rawSearchParams = useSearchParams();
    const searchParams = rawSearchParams ?? new URLSearchParams();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [chats, setChats] = useState<ChatWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permissionsLoading && !hasPermission('access_live_chat')) {
      redirect('/dashboard?error=unauthorized');
    }
  }, [permissionsLoading, hasPermission]);


  const tab = searchParams.get('tab') || 'active';

  useEffect(() => {
    const fetchChats = async () => {
      // Don't set loading to true on refetches, only on initial load.
      if (chats.length === 0) setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return redirect('/login');


      const { data: chatsData, error } = await supabase
        .from('chats')
        .select('*, profiles (full_name, username)')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        setChats(chatsData as ChatWithProfile[]);
      }
      setLoading(false);
    };

    fetchChats();

    const intervalId = setInterval(fetchChats, CHAT_POLL_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel('live-chat-dashboard')
      .on<ChatWithProfile>(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'chats' }, 
        (payload) => {
          setChats(currentChats => {
            if (payload.eventType === 'DELETE') {
              return currentChats.filter(c => c.id !== payload.old.id);
            }
            if (payload.eventType === 'INSERT') {
              return [payload.new, ...currentChats].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            }
            if (payload.eventType === 'UPDATE') {
              const updated = currentChats.map(c => c.id === payload.new.id ? payload.new : c);
              return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            }
            return currentChats;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const { activeChats, historyChats } = useMemo(() => {
    const active = chats.filter(c => c.status === 'active');
    const history = chats.filter(c => c.status !== 'active');
    return { activeChats: active, historyChats: history };
  }, [chats]);

  const handleTabChange = (newTab: string) => {
    router.push(`/dashboard/live-chat?tab=${newTab}`);
  };

  if (permissionsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <MessageCircleHeart className="h-8 w-8 text-primary" /> Live Chat
          </h1>
          <p className="text-muted-foreground">
            Monitor and respond to real-time client conversations.
          </p>
        </div>
      </div>
      
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <MessageCircleHeart className="h-4 w-4" />
              Active Chats
              <Badge variant={tab === 'active' ? 'default' : 'secondary'}>{activeChats.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Chat History
            </TabsTrigger>
        </TabsList>
        <Card className="mt-4">
            <TabsContent value="active">
                <CardHeader>
                    <CardTitle>Active Conversations</CardTitle>
                    <CardDescription>{activeChats.length} chats currently require attention.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChatTable chats={activeChats} loading={loading} />
                </CardContent>
            </TabsContent>
            <TabsContent value="history">
                 <CardHeader>
                    <CardTitle>Conversation History</CardTitle>
                    <CardDescription>Browse all completed and archived chats.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChatTable chats={historyChats} loading={loading} />
                </CardContent>
            </TabsContent>
        </Card>
      </Tabs>
    </main>
  );
}
