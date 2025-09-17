
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { PermissionKey, UserRole } from '@/lib/database.types';
import { canManage } from '@/lib/utils';
import { allPermissionKeys } from '@/lib/database.types';

type UpdateResult = {
  success: boolean;
  message: string;
};

const permissionUpdateSchema = z.object({
  permission: z.string(),
  role: z.string(),
  departments: z.array(z.string()), // Array of department UUIDs, or ["ALL"] for global
});

export async function updateRolePermissions(
  permissionsData: z.infer<typeof permissionUpdateSchema>[]
): Promise<UpdateResult> {
  const supabase = await createClient();

  // 1. Check current user permissions
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, message: 'You are not authenticated.' };
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  const managingUserRole = currentUserProfile?.role;
  if (!managingUserRole) {
    return { success: false, message: 'Could not determine your role.' };
  }

  if (!['system_admin', 'super_admin', 'ceo'].includes(managingUserRole)) {
     return { success: false, message: 'You do not have permission to modify roles.' };
  }


  try {
    const recordsToInsert: { role: UserRole; permission: PermissionKey; department_id?: string | null }[] = [];
    
    // First, clear all existing permissions for the roles being managed.
    // This is safer than trying to diff changes.
    const rolesBeingManaged = [...new Set(permissionsData.map(p => p.role as UserRole))];
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .in('role', rolesBeingManaged);
    
    if (deleteError) {
      throw new Error(`Database error clearing old permissions: ${deleteError.message}`);
    }
    
    // Now, construct the new records to insert
    permissionsData.forEach(p => {
        const isGlobal = p.departments.includes('ALL');
        
        if (isGlobal) {
            recordsToInsert.push({
                role: p.role as UserRole,
                permission: p.permission as PermissionKey,
                department_id: null,
            });
        } else {
            p.departments.forEach(deptId => {
                recordsToInsert.push({
                    role: p.role as UserRole,
                    permission: p.permission as PermissionKey,
                    department_id: deptId,
                });
            });
        }
    });

    if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(recordsToInsert);

        if (insertError) {
            throw new Error(`Database error inserting new permissions: ${insertError.message}`);
        }
    }


    revalidatePath('/dashboard/role-permissions', 'layout');
    return { success: true, message: 'Permissions updated successfully.' };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
