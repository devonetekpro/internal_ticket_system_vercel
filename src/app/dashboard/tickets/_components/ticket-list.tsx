

'use client'

import React, { useState, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table'
  import { Badge } from '@/components/ui/badge'
  import { ArrowUpRight, UserCheck, Ticket, Users, AlertTriangle, ChevronsUpDown, Loader2 } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  import Link from 'next/link'
  import { formatDistanceToNow } from 'date-fns'
  import type { Database } from '@/lib/database.types'
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
  import { getInitials, cn } from '@/lib/utils'
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
  import TicketAssigneePopover from './ticket-assignee-popover'
  import type { TicketWithRelations, UserProfile } from '../page'
  import { Checkbox } from '@/components/ui/checkbox'
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
  import { bulkUpdateTickets } from '../_actions/bulk-update-tickets'
  import { toast } from 'sonner'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
  import { usePermissions } from '@/components/providers/permissions-provider'

  
  const statusColors = {
    open: 'bg-green-500/20 text-green-400 border-green-500/50',
    in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    closed: 'bg-red-500/20 text-red-400 border-red-500/50',
    resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  }
  
  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  }
  
  
  interface TicketListProps {
    tickets: TicketWithRelations[]
    allUsers: UserProfile[]
    currentUserProfile: Database['public']['Tables']['profiles']['Row'] | null
  }
  
  export default function TicketList({ tickets, allUsers, currentUserProfile }: TicketListProps) {
    const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
    const { hasPermission } = usePermissions();

    const canManageTickets = hasPermission('assign_tickets') || hasPermission('change_ticket_status');
  
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedTicketIds(tickets.map(t => t.id))
        } else {
            setSelectedTicketIds([])
        }
    }
    
    const handleSelectRow = (ticketId: string, checked: boolean) => {
        if (checked) {
            setSelectedTicketIds(prev => [...prev, ticketId])
        } else {
            setSelectedTicketIds(prev => prev.filter(id => id !== ticketId))
        }
    }

    const handleBulkUpdate = async (updates: { status?: string; priority?: string; assigned_to?: string | null }) => {
        setIsUpdating(true);
        const result = await bulkUpdateTickets(selectedTicketIds, updates);
        if (result.success) {
            toast.success(result.message);
            setSelectedTicketIds([]);
        } else {
            toast.error(result.message);
        }
        setIsUpdating(false);
    }

    const getAssigneeName = (ticket: TicketWithRelations) => {
      if (ticket.assigned_to_profile) {
        return ticket.assigned_to_profile.full_name ?? ticket.assigned_to_profile.username
      }
      return 'Unassigned'
    }
    
    const getAssigneeInitials = (ticket: TicketWithRelations) => {
      if (ticket.assigned_to_profile) {
        return getInitials(ticket.assigned_to_profile.full_name, ticket.assigned_to_profile.username)
      }
      return '?'
    }
  
    const getAssigneeAvatar = (ticket: TicketWithRelations) => {
      if (ticket.assigned_to_profile) {
        return ticket.assigned_to_profile.avatar_url
      }
      return null
    }

    if (tickets.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 h-96">
                <div className="bg-muted p-4 rounded-full">
                    <Ticket className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">No tickets here</h3>
                <p className="mt-2 text-sm text-muted-foreground">It looks like there are no tickets in this view.</p>
                {hasPermission('create_tickets') && (
                    <Button asChild className="mt-6">
                        <Link href="/dashboard/create-ticket">Create a Ticket</Link>
                    </Button>
                )}
            </div>
        )
    }

    const isStale = (updatedAt: string) => {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        return new Date(updatedAt) < fortyEightHoursAgo;
    };

    return (
        <div>
            {selectedTicketIds.length > 0 && canManageTickets && (
                <div className="bg-muted rounded-lg p-2 mb-4 flex items-center gap-4 animate-in fade-in-50">
                    <span className="text-sm font-semibold pl-2">{selectedTicketIds.length} selected</span>
                    {hasPermission('change_ticket_status') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isUpdating}>
                                    Change Status <ChevronsUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {['open', 'in_progress', 'resolved', 'closed'].map(status => (
                                    <DropdownMenuItem key={status} onSelect={() => handleBulkUpdate({ status })}>
                                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {hasPermission('edit_ticket_properties') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isUpdating}>
                                    Change Priority <ChevronsUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {['low', 'medium', 'high', 'critical'].map(priority => (
                                    <DropdownMenuItem key={priority} onSelect={() => handleBulkUpdate({ priority })}>
                                        {priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {hasPermission('assign_tickets') && (
                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isUpdating}>
                                    Assign To... <ChevronsUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search users..." />
                                    <CommandList>
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => { handleBulkUpdate({ assigned_to: null }); setAssigneePopoverOpen(false); }}>Unassigned</CommandItem>
                                        {allUsers.map(user => (
                                            <CommandItem key={user.id} onSelect={() => { handleBulkUpdate({ assigned_to: user.id }); setAssigneePopoverOpen(false); }}>
                                                {user.full_name ?? user.username}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}

                    {isUpdating && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                </div>
            )}
            <Table className="border rounded-lg">
                <TableHeader>
                <TableRow>
                    {canManageTickets && (
                        <TableHead className="w-[40px]">
                            <Checkbox 
                                checked={selectedTicketIds.length > 0 && selectedTicketIds.length === tickets.length ? true : (selectedTicketIds.length > 0 ? 'indeterminate' : false)}
                                onCheckedChange={handleSelectAll}
                            />
                        </TableHead>
                    )}
                    <TableHead className="w-[80px] hidden sm:table-cell">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Priority</TableHead>
                    <TableHead className="hidden xl:table-cell">Department(s)</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="hidden md:table-cell">Collaborators</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                    <TableHead>
                    <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className={cn(isStale(ticket.updated_at) && ticket.status !== 'closed' && ticket.status !== 'resolved' && 'bg-amber-500/5 hover:bg-amber-500/10', selectedTicketIds.includes(ticket.id) && 'bg-muted/50')}>
                        {canManageTickets && (
                            <TableCell>
                                <Checkbox 
                                    checked={selectedTicketIds.includes(ticket.id)}
                                    onCheckedChange={(checked) => handleSelectRow(ticket.id, !!checked)}
                                />
                            </TableCell>
                        )}
                        <TableCell className="font-mono text-xs hidden sm:table-cell">{ticket.id.substring(0, 8)}</TableCell>
                        <TableCell className="font-medium">
                            <div className="font-bold flex items-center gap-2">
                                <Link href={`/dashboard/tickets/${ticket.id}`} className="hover:underline">{ticket.title}</Link>
                                {ticket.assigned_to === currentUserProfile?.id && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <UserCheck className="h-4 w-4 text-primary" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Assigned to you</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Created by: {ticket.created_by_profile?.full_name ?? ticket.created_by_profile?.username}
                            </div>
                        </TableCell>
                        <TableCell>
                        <Badge
                            variant="outline"
                            className={`capitalize ${
                            statusColors[ticket.status as keyof typeof statusColors]
                            }`}
                        >
                            {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                        <Badge
                            variant="outline"
                            className={`capitalize ${
                            priorityColors[
                                ticket.priority as keyof typeof priorityColors
                            ]
                            }`}
                        >
                            {ticket.priority}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                            {ticket.departments.map(d => <Badge key={d.name} variant="secondary">{d.name}</Badge>)}
                        </div>
                        </TableCell>
                        <TableCell>
                        {hasPermission('assign_tickets') ? (
                            <TicketAssigneePopover
                                ticket={ticket as any} 
                                allUsers={allUsers} 
                                currentUserProfile={currentUserProfile}
                            />
                            ) : (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={getAssigneeAvatar(ticket) ?? ''} />
                                    <AvatarFallback>{getAssigneeInitials(ticket)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{getAssigneeName(ticket)}</span>
                            </div>
                            )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                        <div className="flex items-center -space-x-2">
                            {ticket.internal_ticket_collaborators && ticket.internal_ticket_collaborators.length > 0 ? (
                                ticket.internal_ticket_collaborators.map(c => c.profiles && (
                                    <TooltipProvider key={c.user_id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                                                    <AvatarFallback>{getInitials(c.profiles?.full_name, c.profiles?.username)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{c.profiles?.full_name ?? 'Unknown User'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))
                            ) : <span className="text-xs text-muted-foreground pl-2">None</span> }
                        </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                                {isStale(ticket.updated_at) && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>This ticket is stale (no update in 48h).</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                {formatDistanceToNow(new Date(ticket.updated_at), {
                                    addSuffix: true,
                                })}
                            </div>
                        </TableCell>
                        <TableCell>
                        <Button asChild variant="ghost" size="icon">
                            <Link href={`/dashboard/tickets/${ticket.id}`}>
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="sr-only">View</span>
                            </Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
  }
