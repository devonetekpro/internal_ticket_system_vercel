
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cookies } from 'next/headers';

export type Task = {
  id: string;
  column_id: string;
  content: string | null;
  position: number;
  internal_ticket_id: string | null;
  internal_tickets: {
      id: string;
      title: string;
      priority: string;
      assigned_to_profile: {
          avatar_url: string | null;
          full_name: string | null;
          username: string | null;
      } | null;
  } | null;
};

export type TaskColumn = {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
};

export async function getTaskBoardData(): Promise<TaskColumn[]> {
  const cookieStore = cookies();
  const supabase =  await createClient();

  const { data: columnsData, error: columnsError } = await supabase
    .from('task_columns')
    .select('*')
    .order('position');

  if (columnsError) {
    console.error('Error fetching columns:', columnsError);
    return [];
  }

  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select(`
        *,
        internal_tickets!left (
            id,
            title,
            priority,
            assigned_to_profile:profiles!internal_tickets_assigned_to_fkey (
                avatar_url,
                full_name,
                username
            )
        )
    `)
    .order('position');
  
  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
  }

  // console.log('Fetched Tasks Data from DB:', JSON.stringify(tasksData, null, 2));

  const tasks = (tasksData as Task[]) ?? [];

  const boardData: TaskColumn[] = columnsData.map(col => ({
    id: col.id,
    title: col.title,
    position: col.position,
    tasks: tasks.filter(task => task.column_id === col.id),
  }));

  return boardData;
}


export async function createTask(columnId: string, content: string, internalTicketId?: string) {
    const cookieStore = cookies();
    const supabase = await createClient();

    const { data: maxPositionResult } = await supabase
        .from('tasks')
        .select('position')
        .eq('column_id', columnId)
        .order('position', { ascending: false })
        .limit(1);
        
    const maxPosition = maxPositionResult?.[0]?.position;
    const newPosition = (maxPosition === undefined || maxPosition === null) ? 0 : maxPosition + 1;

    const { error } = await supabase
        .from('tasks')
        .insert({ 
            column_id: columnId, 
            content, 
            position: newPosition,
            internal_ticket_id: internalTicketId,
        });

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Task created' };
}

export async function addTicketToTaskBoard(ticketId: string, ticketTitle: string) {
    const cookieStore = cookies();
    const supabase = await createClient();

    // 1. Check if a task for this ticket already exists
    const { data: existingTask, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('internal_ticket_id', ticketId)
        .limit(1);

    if (checkError) {
        return { success: false, message: `Error checking for existing task: ${checkError.message}` };
    }

    if (existingTask.length > 0) {
        return { success: false, message: 'This ticket is already on the task board.' };
    }

    // 2. Find the "Backlog" column, or the first column as a fallback
    let { data: targetColumn } = await supabase.from('task_columns').select('id').ilike('title', 'backlog').limit(1).single();
    if (!targetColumn) {
        let { data: firstColumn } = await supabase.from('task_columns').select('id').order('position').limit(1).single();
        if (!firstColumn) {
            return { success: false, message: 'No columns found on the task board. Please create one first.' };
        }
        targetColumn = firstColumn;
    }
    
    // 3. Create the task
    const result = await createTask(targetColumn.id, ticketTitle, ticketId);
    
    revalidatePath(`/dashboard/tickets/${ticketId}`);
    revalidatePath('/dashboard/tasks');

    return result;
}


export async function updateTaskOrder(tasksToUpdate: { id: string; position: number; column_id: string }[]) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // In a real app, you'd want this to be a transaction.
  // Supabase edge functions are a good way to handle this.
  const { error } = await supabase.from('tasks').upsert(tasksToUpdate);
  
  if (error) {
    console.error('Error updating task order:', error);
    return { success: false, message: `Failed to update task positions: ${error.message}` };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true, message: 'Task positions updated' };
}

export async function deleteTask(taskId: string) {
  const cookieStore = cookies();
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true, message: 'Task deleted' };
}
