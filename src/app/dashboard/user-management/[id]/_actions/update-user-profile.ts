
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { allUserRoles, type UserRole } from '@/lib/database.types';
import { canManage } from '@/lib/utils';

const updateProfileSchema = z.object({
  role: z.enum(allUserRoles as [string, ...string[]]),
  department_id: z.string().uuid().nullable(),
})

type UpdateResult = {
  success: boolean;
  message: string;
}

export async function updateUserProfile(
  userId: string,
  data: z.infer<typeof updateProfileSchema>
): Promise<UpdateResult> {
  const supabase = await createClient()

  // 1. Check current user permissions
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, message: 'You are not authenticated.' }
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', currentUser.id)
    .single()

  const managingUserRole = currentUserProfile?.role
  if (!managingUserRole) {
    return { success: false, message: 'Could not determine your role.' };
  }
  
  // 2. Fetch the profile of the user being edited
  const { data: targetUserProfile, error: targetUserError } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', userId)
    .single()

  if (targetUserError || !targetUserProfile || !targetUserProfile.role) {
    return { success: false, message: 'Could not find the user to update.'}
  }

  // 3. Enforce Hierarchy Rules using the canManage helper
  if (!canManage(managingUserRole, targetUserProfile.role)) {
    return { success: false, message: 'You do not have permission to modify this user.'}
  }

  const newRole = data.role;
  // Prevent escalation: check if the new role is one the current admin is allowed to assign.
  if (managingUserRole === 'admin' && ['system_admin', 'ceo'].includes(newRole)) {
      return { success: false, message: "You do not have permission to assign a user to this role."};
  }
  if (managingUserRole === 'ceo' && newRole === 'system_admin') {
      return { success: false, message: "You do not have permission to assign a user to this role."};
  }
  
  // 4. Validate input data
  const parseResult = updateProfileSchema.safeParse(data)
  if (!parseResult.success) {
    return { success: false, message: `Invalid data provided: ${parseResult.error.message}` }
  }

  const { role, department_id } = parseResult.data

  // 5. Update the profile
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        department_id: department_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    revalidatePath('/dashboard/user-management')
    revalidatePath(`/dashboard/user-management/${userId}`)
    
    return { success: true, message: 'Profile updated successfully.' }

  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
