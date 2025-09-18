
'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { canManage } from '@/lib/utils';

export async function hardDeleteUser(userId: string): Promise<{ success: boolean, message: string }> {
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, message: 'You are not authenticated.' };
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (!currentUserProfile?.role || !['system_admin', 'super_admin', 'ceo'].includes(currentUserProfile.role)) {
    return { success: false, message: 'You do not have permission to permanently delete users.' };
  }

  const { data: targetUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  // It's ok if the target user profile doesn't exist in our table if we're doing a hard delete.
  // We only need to check hierarchy if they do exist.
  if (targetUserProfile?.role && currentUser.id !== userId) {
      if (!canManage(currentUserProfile.role, targetUserProfile.role)) {
        return { success: false, message: 'Hierarchy violation: You cannot delete a user with an equal or higher role.' };
      }
  }
  
  if (currentUser.id === userId) {
      return { success: false, message: 'You cannot delete yourself.' };
  }

  try {
    // With `ON DELETE CASCADE` set up in the database, we only need to delete
    // the user from the `auth.users` table. The database will handle the rest.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      // If the user is already gone from auth but not our table, it's not a failure.
      if (authError.message.includes('User not found')) {
        console.warn(`User ${userId} not found in auth, but deletion was requested. Proceeding to clean up profile.`);
        // Attempt to clean up the profile row just in case.
        await supabase.from('profiles').delete().eq('id', userId);
      } else {
        throw new Error(`Error deleting user from authentication system: ${authError.message}`);
      }
    }
    
    revalidatePath('/dashboard/user-management');

    return { success: true, message: 'User and all their data have been permanently deleted.' };

  } catch (error: any) {
    console.error('Error hard deleting user:', error);
    return { success: false, message: `Failed to permanently delete user: ${error.message}` };
  }
}
