
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/lib/helpers/permissions'

type UpdateStatusResult = {
  success: boolean;
  message: string;
}

export async function updateTicketStatus(ticketId: string, newStatus: string): Promise<UpdateStatusResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be logged in to update a ticket.' }
  }

  const canUpdateStatus = await checkPermission('change_ticket_status');
  if (!canUpdateStatus) {
    return { success: false, message: 'You do not have permission to change ticket status.' };
  }


  try {
    const updateData: { status: string; } = {
      status: newStatus,
    }

    // Update the ticket status in the correct table
    const { error: updateError } = await supabase
      .from('internal_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (updateError) {
      throw new Error(`Failed to update ticket status: ${updateError.message}`)
    }

    // Create a system comment for the status change
    const { data: userData } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const userName = userData?.full_name ?? user.email;
    
    // The database trigger 'on_ticket_status_change' now handles the notification.
    // We can still create a system comment for the activity feed.
    const { error: commentError } = await supabase.from('ticket_comments').insert({
      internal_ticket_id: ticketId,
      user_id: user.id, 
      content: `<b>${userName}</b> changed status to <b>${newStatus.replace(/_/g, ' ')}</b>`,
    })

    if (commentError) {
        // Log the error but don't fail the whole operation,
        // as the primary action (status update) was successful.
        console.error('Failed to create status change comment:', commentError.message)
    }

    revalidatePath(`/dashboard/tickets/${ticketId}`)
    return { success: true, message: `Ticket status updated to ${newStatus}.` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
