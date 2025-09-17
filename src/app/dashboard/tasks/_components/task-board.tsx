
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  Active,
  Over
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import {Trash2, Loader2} from 'lucide-react'

import TaskColumn from './task-column';
import TaskCard from './task-card';
import type { TaskColumn as ColumnType, Task } from '../_actions/task-actions';
import { updateTaskOrder, deleteTask, getTaskBoardData } from '../_actions/task-actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export type Id = string | number;

interface TaskBoardProps {
  initialBoardData: ColumnType[];
}

const Trash = ({active}: {active: Active | null}) => {
    const isActiveTask = active?.data.current?.type === 'Task';
    return (
        <div className={cn("p-4 rounded-lg flex items-center justify-center gap-2 text-destructive",
            "border-2 border-dashed border-destructive",
            isActiveTask && "bg-destructive/10"
        )}>
            <Trash2 className="h-6 w-6"/>
            <span>Drop here to delete</span>
        </div>
    )
}

const BoardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        ))}
    </div>
)


export default function TaskBoard({ initialBoardData }: TaskBoardProps) {
  const [columns, setColumns] = useState<ColumnType[]>(initialBoardData);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setColumns(initialBoardData);
    setLoading(initialBoardData.length === 0);
  }, [initialBoardData]);

  const fetchBoardData = async () => {
      setLoading(true);
      const boardData = await getTaskBoardData();
      setColumns(boardData);
      setLoading(false);
  }

  const columnsMap = useMemo(() => {
    const map = new Map<string, ColumnType>();
    columns.forEach(col => map.set(col.id, col));
    return map;
  }, [columns]);

  const tasks = useMemo(() => {
    return columns.flatMap(col => col.tasks);
  }, [columns]);

  const columnIds = useMemo(() => {
    return columns.map(col => col.id);
  }, [columns]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px drag needed to start
      },
    })
  );
  
  const onDragStart = (event: DragStartEvent) => {
    setActive(event.active);
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
      return;
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActive(null);
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    if (over.id === 'trash') {
        const result = await deleteTask(active.id as string);
        if (result.success) {
            toast.success(result.message);
            fetchBoardData(); // Refetch data after delete
        } else {
            toast.error(result.message);
        }
        return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // This handles reordering within the same column or dropping on another task
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
        if (activeTask.column_id === overTask.column_id) {
             setColumns(prev => {
                const newColumns = prev.map(col => {
                    if (col.id === activeTask.column_id) {
                        const activeIndex = col.tasks.findIndex(t => t.id === activeId);
                        const overIndex = col.tasks.findIndex(t => t.id === overId);
                        col.tasks = arrayMove(col.tasks, activeIndex, overIndex);
                    }
                    return col;
                });
                return newColumns;
            });
        }
    }
    
    const tasksToUpdate = columns.flatMap(col => 
        col.tasks.map((task, index) => ({
            id: task.id,
            position: index,
            column_id: col.id,
        }))
    );
    
    const result = await updateTaskOrder(tasksToUpdate);
    if (!result.success) {
      toast.error(result.message);
      // Revert on failure
      fetchBoardData();
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const isActiveATask = active.data.current?.type === 'Task';
    if (!isActiveATask) return;

    const isOverAColumn = over.data.current?.type === 'Column';
    const isOverATask = over.data.current?.type === 'Task';

    setColumns(prev => {
      let newColumns = [...prev.map(c => ({...c, tasks: [...c.tasks]}))]; // Deep copy
      
      const activeTask = tasks.find(t => t.id === activeId);
      if (!activeTask) return prev;

      let sourceColumn = newColumns.find(c => c.tasks.some(t => t.id === activeId));
      if (!sourceColumn) return prev;
      
      // Remove task from its original column
      sourceColumn.tasks = sourceColumn.tasks.filter(t => t.id !== activeId);

      let targetColumnId: string;
      let targetIndex: number;

      if (isOverATask) {
        const overTask = tasks.find(t => t.id === overId);
        if (!overTask) return prev;
        targetColumnId = overTask.column_id;
        const destColumn = newColumns.find(c => c.id === targetColumnId);
        if (!destColumn) return prev;
        targetIndex = destColumn.tasks.findIndex(t => t.id === overId);
        if (targetIndex === -1) targetIndex = destColumn.tasks.length;
      } else if (isOverAColumn) {
        targetColumnId = overId;
        const destColumn = newColumns.find(c => c.id === targetColumnId);
        if (!destColumn) return prev;
        targetIndex = destColumn.tasks.length;
      } else {
        // Re-insert into original column if not over a valid target
        sourceColumn.tasks.push(activeTask);
        return newColumns;
      }
      
      const destColumn = newColumns.find(c => c.id === targetColumnId);
      if (!destColumn) return prev;
      
      activeTask.column_id = targetColumnId;
      destColumn.tasks.splice(targetIndex, 0, activeTask);

      return newColumns;
    });
  };

  if (loading) {
      return <BoardSkeleton />
  }

  return (
    <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
    >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <SortableContext items={columnIds}>
                {columns.map((col) => (
                    <TaskColumn
                        key={col.id}
                        column={col}
                        onTaskCreated={fetchBoardData}
                    />
                ))}
            </SortableContext>
        </div>
        
        <div className="mt-8">
            {active && <Trash active={active} />}
        </div>
        
        {typeof document !== 'undefined' && createPortal(
            <DragOverlay>
            {activeTask && (
                <TaskCard
                    task={activeTask}
                    accentColorHue={100}
                />
            )}
            </DragOverlay>,
            document.body
        )}
    </DndContext>
  );
}
