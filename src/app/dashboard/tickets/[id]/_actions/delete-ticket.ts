
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/database.types'
import { checkPermission } from '@/lib/helpers/permissions'

type Result = {
  success: boolean
  message: string
}

export async function deleteTicket(ticketId: string): Promise<Result> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be logged in to delete a ticket.' }
  }

  // 1. Get the ticket and check if user is the creator
  const { data: ticket, error: ticketError } = await supabase
    .from('internal_tickets')
    .select('created_by')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return { success: false, message: 'Ticket not found.' }
  }
  
  // 2. Check permissions
  const isCreator = ticket.created_by === user.id;
  const canDeleteByRole = await checkPermission('delete_tickets');
  
  if (!isCreator && !canDeleteByRole) {
    return { success: false, message: 'You do not have permission to delete this ticket.' }
  }

  // 3. Perform the deletion. The database is set up with cascading deletes.
  try {
    const { error: deleteError } = await supabase.from('internal_tickets').delete().eq('id', ticketId)

    if (deleteError) {
      throw new Error(`Failed to delete ticket: ${deleteError.message}`)
    }

    revalidatePath('/dashboard/tickets')
    revalidatePath('/dashboard')
    
    // Instead of redirecting here, return success
    return { success: true, message: 'Ticket deleted successfully.' }

  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
