

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Department } from '@/lib/database.types';
import { checkPermission } from '@/lib/helpers/permissions';

const departmentSchema = z.string().min(2, { message: 'Department name must be at least 2 characters.' });

type Result = {
  success: boolean;
  message: string;
  data?: Department[];
};

type SingleResult = {
    success: boolean;
    message: string;
    data?: Department;
};


export async function createDepartment(name: string): Promise<Result> {
  const permitted = await checkPermission('manage_departments');
  if (!permitted) {
    return { success: false, message: 'You do not have permission to create departments.' };
  }
  
  const supabase = await createClient();
  
  // Validate input
  const parseResult = departmentSchema.safeParse(name);
  if (!parseResult.success) {
    return { success: false, message: parseResult.error.errors.map(e => e.message).join(', ') };
  }

  // Check for existing department
  const { data: existingDepartment, error: existingError } = await supabase
    .from('departments')
    .select('id')
    .ilike('name', parseResult.data)
    .single();

  if (existingError && existingError.code !== 'PGRST116') { // 'PGRST116' means no rows found, which is good
    return { success: false, message: `Database error: ${existingError.message}` };
  }
  
  if (existingDepartment) {
    return { success: false, message: 'A department with this name already exists.' };
  }

  // Create the department
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert({ name: parseResult.data })
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    revalidatePath('/dashboard/admin-panel');
    return { success: true, message: 'Department created successfully.', data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateDepartment(id: string, name: string): Promise<SingleResult> {
    const permitted = await checkPermission('manage_departments');
    if (!permitted) {
        return { success: false, message: 'You do not have permission to update departments.' };
    }

    const supabase = await createClient();

    const parseResult = departmentSchema.safeParse(name);
    if (!parseResult.success) {
        return { success: false, message: parseResult.error.errors.map(e => e.message).join(', ') };
    }

    try {
        const { data, error } = await supabase
            .from('departments')
            .update({ name: parseResult.data })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Database error: ${error.message}`);
        
        revalidatePath('/dashboard/admin-panel');
        return { success: true, message: 'Department updated successfully.', data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteDepartment(id: string): Promise<Omit<Result, 'data'>> {
    const permitted = await checkPermission('manage_departments');
    if (!permitted) {
        return { success: false, message: 'You do not have permission to delete departments.' };
    }
    
    const supabase = await createClient();

    try {
        // Optional: Check if department is in use before deleting
        const { data: usersInDept, error: userCheckError } = await supabase.from('profiles').select('id').eq('department_id', id).limit(1);
        if(userCheckError) throw new Error(`Database error: ${userCheckError.message}`);
        if(usersInDept.length > 0) return { success: false, message: 'Cannot delete department. It is currently assigned to one or more users.' };
        
        const { error } = await supabase.from('departments').delete().eq('id', id);

        if (error) throw new Error(`Database error: ${error.message}`);
        
        revalidatePath('/dashboard/admin-panel');
        return { success: true, message: 'Department deleted successfully.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
