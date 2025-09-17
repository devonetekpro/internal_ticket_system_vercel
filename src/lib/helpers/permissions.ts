
'use server';

import { createClient } from '@/lib/supabase/server';
import type { PermissionKey, UserRole } from '@/lib/database.types';

type ProfileWithDept = {
  role: UserRole | null;
  department_id: string | null;
}

export async function checkPermission(permission: PermissionKey): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single<ProfileWithDept>();

  if (!profile || !profile.role) {
    return false;
  }
  
  if (['system_admin', 'super_admin', 'ceo'].includes(profile.role)) {
      return true;
  }

  // A permission is granted if a rule exists for:
  // 1. The user's exact role AND their exact department.
  // 2. The user's exact role AND the permission is global (department_id is null).
  const { count, error } = await supabase
    .from('role_permissions')
    .select('*', { count: 'exact', head: true })
    .eq('role', profile.role)
    .eq('permission', permission)
    .or(`department_id.eq.${profile.department_id},department_id.is.null`);

  if (error) {
    console.error(`Error checking permission '${permission}' for role '${profile.role}':`, error);
    return false;
  }

  // If count is greater than 0, a matching rule was found.
  return count !== null && count > 0;
}
