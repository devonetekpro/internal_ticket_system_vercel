
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Task } from '../_actions/task-actions';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  accentColorHue: number;
}

const priorityClassMap: { [key: string]: string } = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
}

export default function TaskCard({ task, accentColorHue }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const assignee = task.internal_tickets?.assigned_to_profile;
  const ticketPriority = task.internal_tickets?.priority;

  if (isDragging) {
    // Return a placeholder with a primary border while dragging
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-card p-2.5 rounded-lg border-2 border-primary opacity-75 shadow-lg"
      >
        <div className="h-full w-full min-h-[5rem]" />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className="bg-muted/40 hover:shadow-md transition-shadow cursor-grab rounded-lg shadow-sm overflow-hidden">
           <div style={{ backgroundColor: `hsl(${accentColorHue}, 70%, 50%)` }} className="h-1 w-full" />
           <CardContent className="p-4 space-y-3">
             <p className="text-sm font-medium pr-2 flex-grow">{task.content}</p>
           </CardContent>
            <CardFooter className="px-4 pb-3 pt-0 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    {ticketPriority && (
                         <Badge variant="outline" className={cn('capitalize text-xs', priorityClassMap[ticketPriority])}>
                            {ticketPriority}
                        </Badge>
                    )}
                    {task.internal_ticket_id && (
                        <Link href={`/dashboard/tickets/${task.internal_ticket_id}`} onClick={(e) => e.stopPropagation()}>
                            <Badge variant="secondary" className="text-xs hover:border-primary/80 transition-colors font-mono">
                                Ticket #{task.internal_ticket_id.substring(0, 7)}
                            </Badge>
                        </Link>
                    )}
                </div>
                 <div className="flex items-center gap-2">
                    <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                    {assignee && (
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.avatar_url ?? ''} />
                            <AvatarFallback>{getInitials(assignee.full_name, assignee.username)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
