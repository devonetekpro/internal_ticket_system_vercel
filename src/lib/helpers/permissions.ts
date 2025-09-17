

'use server';

import { createClient } from '@/lib/supabase/server';
import type { PermissionKey } from '@/components/providers/permissions-provider';

export async function checkPermission(permission: PermissionKey) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.role) {
    return false;
  }
  
  // System admins and CEOs have all permissions implicitly
  if (['system_admin', 'super_admin', 'ceo'].includes(profile.role)) {
      return true;
  }

  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', profile.role)
    .single();

  if (!rolePerms || typeof rolePerms.permissions !== 'object' || rolePerms.permissions === null) {
    return false;
  }
  
  const permissions = rolePerms.permissions as Record<string, boolean>;
  return permissions[permission] === true;
}
