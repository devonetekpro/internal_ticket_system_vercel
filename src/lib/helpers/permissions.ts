
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

  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select('department_id')
    .eq('role', profile.role)
    .eq('permission', permission);

  if (error) {
    console.error(`Error checking permission '${permission}' for role '${profile.role}':`, error);
    return false;
  }

  if (permissions.length === 0) {
    return false;
  }
  
  // Check if there is a global permission (department_id is null)
  const hasGlobalPermission = permissions.some(p => p.department_id === null);
  if (hasGlobalPermission) {
    return true;
  }

  // If no global permission, check for department-specific permission
  if (profile.department_id) {
    const hasDepartmentPermission = permissions.some(p => p.department_id === profile.department_id);
    if (hasDepartmentPermission) {
      return true;
    }
  }

  return false;
}

