
'use client'

import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { notFound, redirect, useRouter } from 'next/navigation'
import type { Database, InternalTicketCollaborator, InternalTicketDepartment } from '@/lib/database.types'
import InternalTicketView from './_components/internal-ticket-view'
import type { User } from '@supabase/supabase-js'
import { RefreshCcw, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { markCommentsAsRead } from './_actions/mark-comments-read'


export const dynamic = 'force-dynamic'

type Profile = Database['public']['Tables']['profiles']['Row']
type Department = Database['public']['Tables']['departments']['Row']
export type CommentView = Database['public']['Tables']['comment_views']['Row'] & {
  profiles: Pick<Profile, 'full_name' | 'username'> | null
}
export type CommentWithProfiles = Database['public']['Tables']['ticket_comments']['Row'] & {
    profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'username'> | null,
    comment_views: CommentView[] | null
}

export type TicketCollaboratorWithProfile = InternalTicketCollaborator & {
    profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'username' | 'id'> | null
}

export type TicketDetails =
  Database['public']['Tables']['internal_tickets']['Row'] & {
    departments: Pick<Department, 'name' | 'id'>[]
    created_by_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'username'> | null
    assigned_to_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'username'> | null
    collaborators: TicketCollaboratorWithProfile[]
    comments: CommentWithProfiles[]
  }

const TicketDetailSkeleton = () => {
  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Skeleton className="h-4 w-24" />
            <ChevronRight className="h-4 w-4 mx-1" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-72" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 grid grid-cols-[120px_1fr] gap-x-4 gap-y-4 text-sm">
            <Skeleton className="h-4 w-20" /> <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" /> <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" /> <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" /> <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" /> <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 grid gap-8">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Skeleton className="h-8 w-40" />
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 grid gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" /> <Skeleton className="h-6 w-28" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" /> <Skeleton className="h-6 w-32" />
              </div>
            </CardContent>
          </Card>
          <Card>
             <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-28 mb-4" />
               <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" /> <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

const COMMENT_POLL_INTERVAL = 30000; // 30 seconds

export default function TicketDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase =  createClient()
  const router = useRouter()
  const [ticket, setTicket] = React.useState<TicketDetails | null>(null)
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const [allUsers, setAllUsers] = React.useState<any[]>([])
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, startTransition] = React.useTransition();
  const [isTicketOnBoard, setIsTicketOnBoard] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<CommentWithProfiles | null>(null)

  const fetchTicketData = React.useCallback(async (markAsRead = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
      return
    }
    setCurrentUser(user)

    const { data: ticketData, error } = await supabase
      .from('internal_tickets')
      .select(
        `
        *,
        departments:internal_ticket_departments(departments(id, name)),
        created_by_profile:profiles!internal_tickets_created_by_fkey (id, full_name, avatar_url, username),
        assigned_to_profile:profiles!internal_tickets_assigned_to_fkey (id, full_name, avatar_url, username),
        collaborators:internal_ticket_collaborators!internal_ticket_id(
          *,
          profiles(full_name, avatar_url, username, id)
        )
      `
      )
      .eq('id', params.id)
      .single()

     const { data: commentsData, error: commentsError } = await supabase
      .from('ticket_comments')
      .select(`
          *,
          profiles:profiles!ticket_comments_user_id_fkey (full_name, avatar_url, username),
          comment_views(*, profiles(full_name, username))
      `)
      .eq('internal_ticket_id', params.id)
      .order('created_at', { ascending: true });
    
    if (error || !ticketData) {
      console.error("Ticket fetch error:", error)
      notFound()
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    setUserRole(profile?.role ?? null)

    const isCreator = ticketData.created_by === user.id;
    const isAssignee = ticketData.assigned_to === user.id;
    const isCollaborator = ticketData.collaborators.some((c: any) => c.profiles?.id === user.id);
    const canViewAll = profile?.role && ['system_admin', 'admin', 'manager', 'department_head', 'ceo'].includes(profile.role);

    if (!isCreator && !isAssignee && !isCollaborator && !canViewAll) {
      toast.error("You don't have permission to view this ticket.");
      router.push('/dashboard/tickets');
      return;
    }

    if (commentsError) {
      console.error("Comments fetch error:", commentsError);
    }
    
    if (markAsRead && commentsData && commentsData.length > 0) {
      const commentIdsToMark = commentsData
          .filter(c => {
              // Mark if comment is not from current user and not already viewed by them
              const isOwnComment = c.user_id === user.id;
              const hasViewed = c.comment_views?.some(v => v.user_id === user.id);
              return !isOwnComment && !hasViewed;
          })
          .map(c => c.id);

      if (commentIdsToMark.length > 0) {
        await markCommentsAsRead(commentIdsToMark);
      }
    }

    const formattedTicket = {
        ...ticketData,
        collaborators: ticketData.collaborators.map((c: any) => c).filter(Boolean),
        departments: ticketData.departments.map((d: any) => d.departments).filter(Boolean),
        comments: commentsData,
    }
    setTicket(formattedTicket as TicketDetails)
      
    const { data: allUsersData } = await supabase.from('profiles').select('id, full_name, username, avatar_url')
    setAllUsers(allUsersData ?? [])

    const { data: taskData, error: taskError } = await supabase.from('tasks').select('id').eq('internal_ticket_id', params.id).limit(1);
    if (!taskError) {
        setIsTicketOnBoard(taskData && taskData.length > 0);
    }
  }, [params.id, supabase, router]);

  const handleRefresh = () => {
    startTransition(async () => {
      setLoading(true);
      await fetchTicketData(true);
      setLoading(false);
      toast.success("Ticket details refreshed.");
    });
  }

  React.useEffect(() => {
    setLoading(true);
    fetchTicketData(true).finally(() => setLoading(false));

    // Set up polling interval
    const intervalId = setInterval(() => fetchTicketData(true), COMMENT_POLL_INTERVAL);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);

  }, [fetchTicketData]);
  
  React.useEffect(() => {
    if (!ticket) return;

    const channel = supabase.channel(`ticket-room-${ticket.id}`)
      .on<CommentWithProfiles>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `internal_ticket_id=eq.${ticket.id}`
        },
        async (payload) => {
          handleRefresh(); // Refresh all data on new comment
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [ticket, supabase, handleRefresh]);


  const handleCommentPosted = (newComment: CommentWithProfiles) => {
    handleRefresh();
  }

  const handleStatusChange = (newStatus: string) => {
    if(ticket) {
        setTicket({ ...ticket, status: newStatus });
    }
  }

  const handleCollaboratorsChange = (newCollaborators: TicketCollaboratorWithProfile[]) => {
    if (ticket) {
      setTicket(prev => prev ? ({ ...prev, collaborators: newCollaborators }) : null);
    }
  }

  if (loading || !ticket || !currentUser) {
    return <TicketDetailSkeleton />;
  }
  
  return (
    <InternalTicketView 
      ticket={ticket} 
      currentUser={currentUser} 
      allUsers={allUsers ?? []} 
      userRole={userRole}
      replyingTo={replyingTo}
      onSetReplyingTo={setReplyingTo}
      onCommentPosted={handleCommentPosted} 
      onStatusChange={handleStatusChange} 
      onCollaboratorsChange={handleCollaboratorsChange}
      isTicketOnBoard={isTicketOnBoard}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}

