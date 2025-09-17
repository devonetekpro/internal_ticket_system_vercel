'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check, Loader2, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'
import { updateTicketStatus } from '../_actions/update-ticket-status'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const allStatuses = [
  { value: 'open', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

interface TicketProgressTrackerProps {
  ticketId: string
  currentStatus: string
  canClose: boolean
  onStatusChange: (status: string) => void
}

export default function TicketProgressTracker({
  ticketId,
  currentStatus,
  canClose,
  onStatusChange,
}: TicketProgressTrackerProps) {
  const [isPending, startTransition] = useTransition()
  
  const availableStatuses = canClose ? allStatuses : allStatuses.filter(s => s.value !== 'closed');
  const currentIndex = availableStatuses.findIndex(s => s.value === currentStatus);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return

    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus)
      if (result.success) {
        toast.success(result.message)
        onStatusChange(newStatus)
      } else {
        toast.error(result.message)
      }
    })
  }
  
  const currentLabel = allStatuses.find(s => s.value === currentStatus)?.label ?? 'Unknown';

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Ticket Progress</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button variant="outline" size="sm" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                ) : (
                    <ChevronsUpDown className="mr-2 h-4 w-4" />
                )}
                Update Stage ({currentLabel})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableStatuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onSelect={() => handleStatusChange(status.value)}
                disabled={isPending || status.value === currentStatus}
              >
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center">
        {availableStatuses.map((status, index) => (
          <React.Fragment key={status.value}>
            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  index <= currentIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {index < currentIndex ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 w-20 truncate',
                  index <= currentIndex ? 'font-semibold' : 'text-muted-foreground',
                )}
              >
                {status.label}
              </span>
            </div>
            {index < availableStatuses.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 transition-colors',
                  index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
