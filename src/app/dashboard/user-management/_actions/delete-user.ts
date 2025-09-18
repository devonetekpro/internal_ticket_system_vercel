
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { canManage } from '@/lib/utils';
import { checkPermission } from '@/lib/helpers/permissions';

export async function deleteUser(userId: string): Promise<{ success: boolean, message: string }> {
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, message: 'You are not authenticated.' };
  }

  // Use a permission check first
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (!currentUserProfile?.role || !['system_admin', 'ceo'].includes(currentUserProfile.role)) {
    return { success: false, message: 'You do not have permission to deactivate users.' };
  }

  const { data: targetUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!targetUserProfile?.role) {
    return { success: false, message: 'Could not determine the role of the user to be deactivated.' };
  }
  
  if (currentUser.id === userId) {
      return { success: false, message: 'You cannot deactivate yourself.' };
  }
  
  // A system_admin can manage anyone except another system_admin (unless they are a super_admin)
  // Let's enforce that a user can't deactivate someone of the same or higher level.
  if (!canManage(currentUserProfile.role, targetUserProfile.role)) {
    return { success: false, message: 'Hierarchy violation: You cannot deactivate a user with an equal or higher role.' };
  }


  // Perform a "soft delete" by updating the deleted_at timestamp
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }
    
    revalidatePath('/dashboard/user-management');

    return { success: true, message: 'User deactivated successfully.' };

  } catch (error: any) {
    console.error('Error soft deleting user:', error);
    return { success: false, message: `Failed to deactivate user: ${error.message}` };
  }
}
