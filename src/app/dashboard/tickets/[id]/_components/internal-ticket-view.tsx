
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Edit, Share2, Globe, Trash2, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import TicketViewLayout from './ticket-view-layout'
import type { TicketDetails, CommentWithProfiles, TicketCollaboratorWithProfile } from '../page'
import type { User } from '@supabase/supabase-js'
import TicketProgressTracker from './ticket-progress-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/components/providers/permissions-provider'

type ProfileStub = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

interface InternalTicketViewProps {
    ticket: TicketDetails
    currentUser: User
    allUsers: ProfileStub[]
    userRole: string | null
    onCommentPosted: (comment: CommentWithProfiles) => void
    onStatusChange: (status: string) => void
    onCollaboratorsChange: (collaborators: TicketCollaboratorWithProfile[]) => void
    isTicketOnBoard: boolean
    onRefresh: () => void;
    isRefreshing: boolean;
}

export default function InternalTicketView({ ticket, currentUser, allUsers, userRole, onCommentPosted, onStatusChange, onCollaboratorsChange, isTicketOnBoard, onRefresh, isRefreshing }: InternalTicketViewProps) {
    const [replyingTo, setReplyingTo] = React.useState<CommentWithProfiles | null>(null)
    const { hasPermission } = usePermissions();

    const canCloseTicket = hasPermission('change_ticket_status');
    const canEditTicket = hasPermission('edit_ticket_properties');
    const canDeleteTicket = hasPermission('delete_tickets');

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Ticket URL copied to clipboard!')
    }
    
    return (
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
            <div className="flex items-center justify-between">
                <div>
                     <div className="flex items-center text-sm text-muted-foreground">
                        <Link href="/dashboard/tickets" className="hover:underline">Internal Help Desk</Link>
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <span className="font-medium text-foreground truncate max-w-xs">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.is_external && <Globe className="h-7 w-7 text-muted-foreground" titleAccess='This ticket originated from the external CRM' />}
                      <h1 className="font-headline text-3xl font-bold">{ticket.title}</h1>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}/> Refresh
                    </Button>
                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4"/> Share
                    </Button>
                    {canEditTicket && (
                        <Button variant="outline" asChild>
                        <Link href={`/dashboard/tickets/${ticket.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4"/> Edit
                        </Link>
                        </Button>
                    )}
                     {canDeleteTicket && (
                        <Button variant="destructive" asChild>
                           <span className='flex items-center'><Trash2 className="mr-2 h-4 w-4" /> Delete</span>
                        </Button>
                    )}
                </div>
            </div>

             <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
                        <div className="font-medium text-muted-foreground">Ticket ID</div>
                        <div className="font-mono text-xs mt-1">#{ticket.id.substring(0,8)}</div>

                        <div className="font-medium text-muted-foreground">Created</div>
                        <div>{format(new Date(ticket.created_at), 'PPp')}</div>

                        <div className="font-medium text-muted-foreground">Category</div>
                        <div>{ticket.category}</div>
                        
                        <div className="font-medium text-muted-foreground">Priority</div>
                        <div className="flex items-center gap-2">
                             <div className={cn("w-2 h-2 rounded-full", priorityColors[ticket.priority as keyof typeof priorityColors])} />
                            <span className="capitalize">{ticket.priority}</span>
                        </div>

                        <div className="font-medium text-muted-foreground">Department(s)</div>
                        <div className="flex flex-wrap gap-1">
                          {ticket.departments.map(d => <Badge key={d.id} variant="secondary" className="font-normal">{d.name}</Badge>)}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <TicketProgressTracker 
                            ticketId={ticket.id}
                            currentStatus={ticket.status}
                            canClose={canCloseTicket}
                            onStatusChange={onStatusChange}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <TicketViewLayout 
                    ticket={ticket} 
                    currentUser={currentUser} 
                    allUsers={allUsers} 
                    userRole={userRole} 
                    replyingTo={replyingTo}
                    onSetReplyingTo={setReplyingTo}
                    onCommentPosted={onCommentPosted}
                    onCollaboratorsChange={onCollaboratorsChange}
                    isTicketOnBoard={isTicketOnBoard}
                />
            </div>
        </main>
    )
}
