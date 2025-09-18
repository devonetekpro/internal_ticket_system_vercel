
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type BulkDeleteResult = {
  success: boolean
  message: string
}

export async function bulkDeleteTickets(
  ticketIds: string[]
): Promise<BulkDeleteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You are not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role;
  const canBulkDelete = userRole && ['system_admin', 'super_admin', 'ceo'].includes(userRole);

  if (!canBulkDelete) {
    return { success: false, message: 'You do not have permission to perform this action.' }
  }

  if (ticketIds.length === 0) {
    return { success: false, message: 'No tickets selected.' }
  }

  const { error } = await supabase
    .from('internal_tickets')
    .delete()
    .in('id', ticketIds)

  if (error) {
    console.error('Bulk delete error:', error)
    return { success: false, message: `Failed to delete tickets: ${error.message}` }
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath('/dashboard')

  return { success: true, message: `${ticketIds.length} tickets deleted successfully.` }
}
