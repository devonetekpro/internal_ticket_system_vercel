
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Result = {
  success: boolean
  message: string
}

export async function updateTicketAssignee(
  ticketId: string,
  newAssigneeId: string | null
): Promise<Result> {
  const supabase = await createClient()

  // 1. Get current user and their profile
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { success: false, message: 'You are not authenticated.' }
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role, department_id, full_name, username')
    .eq('id', currentUser.id)
    .single()

  const userRole = currentUserProfile?.role
  const canAssignRoles: (string | null)[] = ['system_admin', 'super_admin', 'admin', 'department_head', 'manager', 'ceo']

  if (!userRole || !canAssignRoles.includes(userRole)) {
    return {
      success: false,
      message: 'You do not have permission to assign tickets.',
    }
  }

  // 2. Enforce manager-specific permissions
  if (userRole === 'manager') {
    if (newAssigneeId) {
        const { data: newAssigneeProfile } = await supabase
            .from('profiles')
            .select('department_id')
            .eq('id', newAssigneeId)
            .single()

        if (newAssigneeProfile?.department_id !== currentUserProfile?.department_id) {
            return {
                success: false,
                message: 'You can only assign tickets to users within your own department.',
            }
        }
    }
  }

  if (userRole === 'department_head') {
      if (newAssigneeId) {
          const { data: newAssigneeProfile } = await supabase
              .from('profiles')
              .select('department_id, role')
              .eq('id', newAssigneeId)
              .single();

          const isSameDepartment = newAssigneeProfile?.department_id === currentUserProfile?.department_id;
          const isTargetManager = newAssigneeProfile?.role === 'manager';
          const isTargetDeptHead = newAssigneeProfile?.role === 'department_head';

          if (!isSameDepartment && !isTargetManager && !isTargetDeptHead) {
              return {
                  success: false,
                  message: "You can only assign tickets to users in your department, other department heads, or any manager."
              }
          }
      }
  }


  // 3. Update the ticket. The trigger will handle the notification.
  try {
    const { error: updateError } = await supabase
      .from('internal_tickets')
      .update({ assigned_to: newAssigneeId })
      .eq('id', ticketId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/dashboard/tickets')
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/tickets/${ticketId}`)
    return { success: true, message: 'Ticket assignee updated successfully.' }
  } catch (error: any) {
    return { success: false, message: `Failed to update assignee: ${error.message}` }
  }
}
