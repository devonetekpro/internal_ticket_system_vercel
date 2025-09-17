

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateProfileSchema = z.object({
  role: z.enum(["ceo", "system_admin", "super_admin", "admin", "department_head", "manager", "agent", "user"]),
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
  if (!managingUserRole || !['system_admin', 'super_admin', 'admin', 'department_head', 'manager', 'ceo'].includes(managingUserRole)) {
    return { success: false, message: 'You do not have permission to update user profiles.' }
  }
  
  // 2. Fetch the profile of the user being edited
  const { data: targetUserProfile, error: targetUserError } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', userId)
    .single()

  if (targetUserError) {
    return { success: false, message: 'Could not find the user to update.'}
  }

  // 3. Enforce Hierarchy Rules (skip for CEO and System Admin)
  if (!['system_admin', 'super_admin', 'ceo'].includes(managingUserRole)) {
    if (managingUserRole === 'manager') {
        if (targetUserProfile?.department_id !== currentUserProfile?.department_id) {
            return { success: false, message: "You can only manage users in your own department." }
        }
        if (['system_admin', 'super_admin', 'admin', 'department_head', 'ceo'].includes(data.role)) {
            return { success: false, message: "You cannot promote users to a higher-level administrative role." }
        }
    }

    if (managingUserRole === 'department_head') {
        if (targetUserProfile?.department_id !== currentUserProfile?.department_id && targetUserProfile.role !== 'manager') {
            return { success: false, message: "You can only manage managers and users within your own department."}
        }
        if (['system_admin', 'super_admin', 'ceo', 'admin'].includes(data.role)) {
             return { success: false, message: "You cannot assign system-wide administrative roles." }
        }
    }
    
    if (managingUserRole === 'admin') {
        if (['system_admin', 'super_admin', 'ceo'].includes(targetUserProfile.role ?? '')) {
            return { success: false, message: "You cannot modify a System Admin, Super Admin or CEO." }
        }
        if (['system_admin', 'super_admin', 'ceo'].includes(data.role)) {
             return { success: false, message: "You do not have permission to create a System Admin, Super Admin or CEO."}
        }
    }
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
