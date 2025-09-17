
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Globe, ChevronRight, Edit, Share2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TicketDetails, CommentWithProfiles, TicketCollaboratorWithProfile } from '../page'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import TicketProgressTracker from './ticket-progress-tracker'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import TicketViewLayout from './ticket-view-layout'


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

interface ExternalTicketViewProps {
    ticket: TicketDetails
    currentUser: SupabaseUser
    allUsers: ProfileStub[]
    userRole: string | null
    onCommentPosted: (comment: CommentWithProfiles) => void
    onStatusChange: (status: string) => void;
    onCollaboratorsChange: (collaborators: TicketCollaboratorWithProfile[]) => void;
}

export default function ExternalTicketView({ ticket, currentUser, allUsers, userRole, onCommentPosted, onStatusChange, onCollaboratorsChange }: ExternalTicketViewProps) {
    const [replyingTo, setReplyingTo] = React.useState<CommentWithProfiles | null>(null)
    const canCloseTicket = userRole === 'system_admin' || userRole === 'manager' || currentUser.id === ticket.created_by

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Ticket URL copied to clipboard!')
    }
    
    return (
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-muted/30 text-foreground">
            <div className="flex items-center justify-between">
                <div>
                     <div className="flex items-center text-sm text-muted-foreground">
                        <Link href="/dashboard/crm-tickets" className="hover:underline">CRM Desk</Link>
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <span className="font-medium text-foreground truncate max-w-xs">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Globe className="h-8 w-8 text-primary" />
                        <h1 className="font-headline text-3xl font-bold">{ticket.title}</h1>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4"/> Share
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/tickets/${ticket.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4"/> Edit
                      </Link>
                    </Button>
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
                 <div className="lg:col-span-3 grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 2a10 10 0 1 0 10 10"/></svg>
                                Client Information
                            </CardTitle>
                            <CardDescription>Details synced from CRM.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Client Name</span>
                                <span>John Doe (Placeholder)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Client Email</span>
                                <span>john.doe@example.com</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Company</span>
                                <span>Example Corp</span>
                            </div>
                             <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">CRM Link</span>
                                <Button variant="link" size="sm" asChild>
                                    <a href="#" target="_blank">View in CRM</a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}
