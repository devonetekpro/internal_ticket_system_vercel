
'use client';

import { SortableContext, useSortable } from '@dnd-kit/sortable';
import React, { useMemo } from 'react';
import { type Task } from '../_actions/task-actions';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './task-card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { createTask } from '../_actions/task-actions';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface TaskColumnProps {
  column: Column;
  onTaskCreated: () => void;
}

export default function TaskColumn({ column, onTaskCreated }: TaskColumnProps) {
  const [isAddingCard, setIsAddingCard] = React.useState(false);
  const [newCardContent, setNewCardContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const tasksIds = useMemo(() => {
    return column.tasks.map((task) => task.id);
  }, [column.tasks]);
  
  const columnColorHue = useMemo(() => {
    if (column.title.toLowerCase() === 'complete') {
        return 140; // A consistent green for "Complete"
    }
    let hash = 0;
    for (let i = 0; i < column.title.length; i++) {
        hash = column.title.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; 
    }
    return Math.abs(hash % 360);
  }, [column.title]);


  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
    disabled: true
  });
  
  const handleAddCard = async () => {
    if (!newCardContent.trim()) return;
    setIsSubmitting(true);
    const result = await createTask(column.id, newCardContent);
    if (result.success) {
        toast.success(result.message);
        setNewCardContent('');
        setIsAddingCard(false);
        onTaskCreated(); // Trigger data refetch
    } else {
        toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div ref={setNodeRef} className="flex flex-col">
        <div className="flex items-center gap-2 mb-4">
            <div style={{ backgroundColor: `hsl(${columnColorHue}, 70%, 50%)` }} className="h-2 w-2 rounded-full" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">{column.title}</h2>
            <span className="text-sm font-medium text-muted-foreground">{column.tasks.length}</span>
        </div>
        <div className="flex flex-col gap-3 flex-grow min-h-[100px]">
            <SortableContext items={tasksIds}>
                {column.tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        accentColorHue={columnColorHue}
                    />
                ))}
            </SortableContext>
            {isAddingCard ? (
                <div className="p-2 border rounded-lg bg-muted/50">
                    <Input 
                        placeholder="Enter task content..."
                        value={newCardContent}
                        onChange={(e) => setNewCardContent(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" onClick={handleAddCard} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(false)}>Cancel</Button>
                    </div>
                </div>
            ) : (
                 <Button variant="ghost" className="justify-start text-muted-foreground mt-2" onClick={() => setIsAddingCard(true)}>
                    <PlusCircle className="h-4 w-4 mr-2"/>
                    Add card
                </Button>
            )}
        </div>
    </div>
  );
}
