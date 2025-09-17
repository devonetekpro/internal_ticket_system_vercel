
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { RolePermissions } from '@/lib/database.types';

type UpdateResult = {
  success: boolean;
  message: string;
};

export async function updateRolePermissions(
  permissionsData: RolePermissions[]
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

  // Only system admins can update permissions.
  if (managingUserRole !== 'system_admin' && managingUserRole !== 'ceo') {
    return { success: false, message: 'You do not have permission to update roles.' };
  }

  try {
    // Using a transaction to ensure all updates succeed or none do.
    const { error } = await supabase.rpc('update_role_permissions', {
      permissions_data: permissionsData,
    });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    revalidatePath('/dashboard/role-permissions');
    return { success: true, message: 'Permissions updated successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// We need a helper function in Postgres to perform the upsert from a JSON array.
// This function needs to be created once in the Supabase SQL editor.
/*
-- Run this in your Supabase SQL Editor once
CREATE OR REPLACE FUNCTION update_role_permissions(permissions_data jsonb)
RETURNS void AS $$
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset(permissions_data) AS x(role public.user_role, permissions jsonb)
  LOOP
    INSERT INTO public.role_permissions (role, permissions)
    VALUES (r.role, r.permissions)
    ON CONFLICT (role)
    DO UPDATE SET permissions = r.permissions;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
*/
