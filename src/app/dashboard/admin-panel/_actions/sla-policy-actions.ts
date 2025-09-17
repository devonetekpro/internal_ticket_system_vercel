
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';

type SlaPolicy = Database['public']['Tables']['sla_policies']['Row'];

const slaPolicySchema = z.object({
  name: z.string().min(3, 'Policy name must be at least 3 characters.'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  department_id: z.string().uuid().nullable().optional(),
  response_time_minutes: z.coerce.number().int().min(1, 'Response time must be at least 1 minute.'),
  resolution_time_minutes: z.coerce.number().int().min(1, 'Resolution time must be at least 1 minute.'),
  is_active: z.boolean(),
});

export async function getSlaPolicies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sla_policies')
    .select('*, departments (name)')
    .order('priority');
  if (error) {
    console.error('Error fetching SLA policies:', error);
    return [];
  }
  return data;
}

export async function createSlaPolicy(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Not authenticated.' };

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description'),
    priority: formData.get('priority'),
    department_id: formData.get('department_id') === 'null' ? null : formData.get('department_id'),
    response_time_minutes: formData.get('response_time_minutes'),
    resolution_time_minutes: formData.get('resolution_time_minutes'),
    is_active: formData.get('is_active') === 'true',
  };

  const result = slaPolicySchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
  }

  const { error } = await supabase.from('sla_policies').insert(result.data);

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
        return { success: false, message: 'A policy for this priority and department combination already exists.' };
    }
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard/admin-panel');
  return { success: true, message: 'SLA Policy created successfully.' };
}

export async function updateSlaPolicy(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated.' };

    const rawData = {
        name: formData.get('name'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        department_id: formData.get('department_id') === 'null' ? null : formData.get('department_id'),
        response_time_minutes: formData.get('response_time_minutes'),
        resolution_time_minutes: formData.get('resolution_time_minutes'),
        is_active: formData.get('is_active') === 'true',
    };

    const result = slaPolicySchema.safeParse(rawData);
    if (!result.success) {
        return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
    }
    
    const { error } = await supabase.from('sla_policies').update(result.data).eq('id', id);

    if (error) {
        if (error.code === '23505') {
            return { success: false, message: 'A policy for this priority and department combination already exists.' };
        }
        return { success: false, message: `Database error: ${error.message}` };
    }

    revalidatePath('/dashboard/admin-panel');
    return { success: true, message: 'SLA Policy updated successfully.' };
}


export async function deleteSlaPolicy(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Not authenticated.' };

  const { error } = await supabase.from('sla_policies').delete().eq('id', id);
  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard/admin-panel');
  return { success: true, message: 'SLA Policy deleted successfully.' };
}
