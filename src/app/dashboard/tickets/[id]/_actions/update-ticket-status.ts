

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/lib/helpers/permissions'

type UpdateStatusResult = {
  success: boolean;
  message: string;
}

export async function updateTicketStatus(ticketId: string, newStatus: string): Promise<UpdateStatusResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You must be logged in to update a ticket.' };
  }

  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('internal_tickets')
      .select('created_by')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return { success: false, message: 'Ticket not found.' };
    }

    const isCreator = ticket.created_by === user.id;
    const canChangeStatusByRole = await checkPermission('change_ticket_status');

    if (!isCreator && !canChangeStatusByRole) {
      return { success: false, message: 'You do not have permission to change the status of this ticket.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, message: 'Could not find your user profile.' };
    }

    const { error: updateError } = await supabase
      .from('internal_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (updateError) {
      throw new Error(`Failed to update ticket status: ${updateError.message}`);
    }

    const userName = profile.full_name ?? profile.username ?? 'System';
    const commentContent = `${userName} changed status to <b>${newStatus.replace(/_/g, ' ')}</b>`;
    
    const commentPayload = {
      internal_ticket_id: ticketId,
      user_id: user.id,
      content: commentContent,
    };

    const { error: commentError } = await supabase
      .from('ticket_comments')
      .insert(commentPayload);

    if (commentError) {
      console.error('Failed to create status change comment:', commentError);
    }

    revalidatePath(`/dashboard/tickets/${ticketId}`);
    revalidatePath('/dashboard/tickets');
    revalidatePath('/dashboard');

    return { success: true, message: `Ticket status updated to ${newStatus}.` };

  } catch (error: any) {
    console.error(`Full error in updateTicketStatus:`, error);
    return { success: false, message: `Failed to update ticket status: ${error.message}` };
  }
}
