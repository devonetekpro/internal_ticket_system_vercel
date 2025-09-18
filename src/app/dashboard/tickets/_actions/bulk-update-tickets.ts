
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type BulkUpdateResult = {
  success: boolean
  message: string
}

async function checkPermissions(): Promise<{ permitted: boolean; message: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { permitted: false, message: 'You are not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canManage = profile?.role && ['system_admin', 'super_admin', 'admin', 'department_head', 'ceo'].includes(profile.role)

  if (!canManage) {
    return { permitted: false, message: 'You do not have permission to perform this action.' }
  }

  return { permitted: true, message: '' }
}

export async function bulkUpdateTickets(
  ticketIds: string[],
  updates: {
    status?: string
    priority?: string
    assigned_to?: string | null
  }
): Promise<BulkUpdateResult> {
  const permissionCheck = await checkPermissions()
  if (!permissionCheck.permitted) {
    return { success: false, message: permissionCheck.message }
  }

  if (ticketIds.length === 0) {
    return { success: false, message: 'No tickets selected.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('internal_tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', ticketIds)

  if (error) {
    console.error('Bulk update error:', error)
    return { success: false, message: `Failed to update tickets: ${error.message}` }
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath('/dashboard')

  return { success: true, message: `${ticketIds.length} tickets updated successfully.` }
}
