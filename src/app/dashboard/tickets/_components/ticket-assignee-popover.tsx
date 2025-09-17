
'use client'

import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'
import { updateTicketAssignee } from '../_actions/update-ticket-assignee'

type Profile = Database['public']['Tables']['profiles']['Row'] & { email: string | undefined }
type Ticket = {
  id: string
  assigned_to: string | null
  internal_ticket_departments: { department_id: string }[]
  assigned_to_profile: {
    full_name: string | null
    avatar_url: string | null
    username: string | null
    email: string | undefined
  } | null
}
type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface TicketAssigneePopoverProps {
  ticket: Ticket
  allUsers: Profile[]
  currentUserProfile: UserProfile | null
}

export default function TicketAssigneePopover({
  ticket,
  allUsers,
  currentUserProfile,
}: TicketAssigneePopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    ticket.assigned_to
  )
  const [isUpdating, setIsUpdating] = React.useState(false)
  
  const handleSelect = async (userId: string | null) => {
    setOpen(false)
    if (userId === selectedUserId) return
    
    setIsUpdating(true)
    
    const result = await updateTicketAssignee(ticket.id, userId)
    setIsUpdating(false)
    
    if (result.success) {
      toast.success(result.message)
      // This will be updated via revalidation, but we can optimistically update state too
      setSelectedUserId(userId)
    } else {
      toast.error(result.message)
    }
  }

  const currentUserRole = currentUserProfile?.role;
  const canAssignRoles = ['system_admin', 'super_admin', 'admin', 'ceo'];

  const usersInDepartment =
    currentUserRole && (currentUserRole === 'manager' || currentUserRole === 'department_head')
      ? allUsers.filter((u) => u.department_id === currentUserProfile?.department_id)
      : allUsers

  const getAssignee = (userId: string | null) => {
    if (!userId) return null
    return allUsers.find((u) => u.id === userId)
  }

  const currentAssignee = getAssignee(selectedUserId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-start p-1 h-auto"
          disabled={isUpdating}
        >
          <div className="flex items-center gap-2 w-full">
            {isUpdating ? (
                 <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <Avatar className="h-6 w-6">
                <AvatarImage src={currentAssignee?.avatar_url ?? ''} />
                <AvatarFallback>
                    {currentAssignee
                    ? getInitials(currentAssignee.full_name, currentAssignee.username, currentAssignee.email)
                    : '?'}
                </AvatarFallback>
                </Avatar>
            )}
            <span className="truncate">
                {currentAssignee?.full_name ?? currentAssignee?.username ?? currentAssignee?.email ?? 'Unassigned'}
            </span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
                <CommandItem onSelect={() => handleSelect(null)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !selectedUserId ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  Unassigned
                </CommandItem>
              {usersInDepartment.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name ?? user.username ?? user.email ?? user.id}
                  onSelect={() => handleSelect(user.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url ?? ''} />
                      <AvatarFallback>
                        {getInitials(user.full_name, user.username, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{user.full_name ?? user.username ?? user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

    