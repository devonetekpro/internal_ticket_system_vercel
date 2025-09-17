
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';

type CommentTemplate = Database['public']['Tables']['comment_templates']['Row'];

const templateSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  content: z.string().min(10, { message: 'Template content must be at least 10 characters.' }),
});

export async function getCommentTemplates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('comment_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comment templates:', error);
    return [];
  }
  return data;
}

export async function createCommentTemplate(
  formData: z.infer<typeof templateSchema>
): Promise<{ success: boolean; message: string; data?: CommentTemplate }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Not authenticated.' };

  const result = templateSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
  }

  const { data: newTemplate, error } = await supabase
    .from('comment_templates')
    .insert({ ...result.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard/account');
  return { success: true, message: 'Template created successfully.', data: newTemplate };
}

export async function updateCommentTemplate(
  id: string,
  formData: z.infer<typeof templateSchema>
): Promise<{ success: boolean; message: string; data?: CommentTemplate }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated.' };

    const result = templateSchema.safeParse(formData);
    if (!result.success) {
        return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
    }

    const { data: updatedTemplate, error } = await supabase
        .from('comment_templates')
        .update(result.data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
    
    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Template updated successfully.', data: updatedTemplate };
}

export async function deleteCommentTemplate(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated.' };

    const { error } = await supabase
        .from('comment_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Template deleted successfully.' };
}
