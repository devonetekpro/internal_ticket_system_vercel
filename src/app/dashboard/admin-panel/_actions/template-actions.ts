

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { checkPermission } from '@/lib/helpers/permissions';

type TicketTemplate = Database['public']['Tables']['ticket_templates']['Row'];

const templateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  department_id: z.string().uuid('Invalid department.'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(3, 'Category must be at least 3 characters.'),
});

export async function getTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ticket_templates')
    .select('*, departments (name)')
    .order('title');
  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  return data;
}

export async function createTemplate(formData: FormData) {
  const permitted = await checkPermission('manage_templates');
  if (!permitted) {
    return { success: false, message: 'You do not have permission to create templates.' };
  }

  const supabase = await createClient();
  
  const rawData = {
    title: formData.get('title'),
    department_id: formData.get('department_id'),
    priority: formData.get('priority'),
    category: formData.get('category'),
  };

  const result = templateSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
  }

  const { error } = await supabase.from('ticket_templates').insert(result.data);

  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard/admin-panel');
  revalidatePath('/dashboard/create-ticket');
  return { success: true, message: 'Template created successfully.' };
}

export async function updateTemplate(id: string, formData: FormData) {
    const permitted = await checkPermission('manage_templates');
    if (!permitted) {
      return { success: false, message: 'You do not have permission to update templates.' };
    }

    const supabase = await createClient();

    const rawData = {
        title: formData.get('title'),
        department_id: formData.get('department_id'),
        priority: formData.get('priority'),
        category: formData.get('category'),
    };

    const result = templateSchema.safeParse(rawData);
    if (!result.success) {
        return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
    }

    const { error } = await supabase.from('ticket_templates').update(result.data).eq('id', id);

    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/admin-panel');
    revalidatePath('/dashboard/create-ticket');
    return { success: true, message: 'Template updated successfully.' };
}


export async function deleteTemplate(id: string) {
  const permitted = await checkPermission('manage_templates');
  if (!permitted) {
    return { success: false, message: 'You do not have permission to delete templates.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('ticket_templates').delete().eq('id', id);
  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard/admin-panel');
  revalidatePath('/dashboard/create-ticket');
  return { success: true, message: 'Template deleted successfully.' };
}
