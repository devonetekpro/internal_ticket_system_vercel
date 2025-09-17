
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { checkPermission } from '@/lib/helpers/permissions';

type PrefilledQuestion = Database['public']['Tables']['prefilled_questions']['Row'];

const questionSchema = z.string().min(5, { message: 'Question must be at least 5 characters.' }).max(200, { message: 'Question must be less than 200 characters.' });

async function checkChatSettingsPermission() {
    const canManage = await checkPermission('manage_chat_settings');
    if (!canManage) {
        return { permitted: false, message: 'You do not have permission to manage chat settings.' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { permitted: false, message: 'Not authenticated.' };

    return { permitted: true, user };
}

export async function getPrefilledQuestions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('prefilled_questions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching prefilled questions:', error);
    return [];
  }
  return data;
}

export async function createPrefilledQuestion(question: string): Promise<{ success: boolean; message: string; data?: PrefilledQuestion }> {
    const { permitted, message, user } = await checkChatSettingsPermission();
    if (!permitted || !user) return { success: false, message };

    const result = questionSchema.safeParse(question);
    if (!result.success) {
        return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
    }
    
    const supabase = await createClient();
    const { data: newQuestion, error } = await supabase
        .from('prefilled_questions')
        .insert({ question: result.data, created_by: user.id })
        .select()
        .single();
        
    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/admin-panel');
    revalidatePath('/api/get-prefilled-questions'); // Ensure public API route is revalidated
    return { success: true, message: 'Question added successfully.', data: newQuestion };
}

export async function updatePrefilledQuestion(id: string, question: string) {
    const { permitted, message } = await checkChatSettingsPermission();
    if (!permitted) return { success: false, message };
    
    const result = questionSchema.safeParse(question);
    if (!result.success) {
        return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
    }
    
    const supabase = await createClient();
    const { error } = await supabase.from('prefilled_questions').update({ question: result.data }).eq('id', id);
    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/admin-panel');
    revalidatePath('/api/get-prefilled-questions');
    return { success: true, message: 'Question updated successfully.' };
}

export async function deletePrefilledQuestion(id: string) {
    const { permitted, message } = await checkChatSettingsPermission();
    if (!permitted) return { success: false, message };

    const supabase = await createClient();
    const { error } = await supabase.from('prefilled_questions').delete().eq('id', id);
    if (error) {
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/admin-panel');
    revalidatePath('/api/get-prefilled-questions');
    return { success: true, message: 'Question deleted successfully.' };
}
