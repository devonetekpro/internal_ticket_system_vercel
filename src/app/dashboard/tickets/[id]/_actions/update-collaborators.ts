
'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { TicketCollaboratorWithProfile } from "../page"

type Result = {
    success: boolean
    message: string
    collaborators?: TicketCollaboratorWithProfile[]
}

async function getUpdatedCollaborators(ticketId: string): Promise<TicketCollaboratorWithProfile[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('internal_ticket_collaborators')
        .select(`
            *,
            profiles (id, full_name, username, avatar_url)
        `)
        .eq('internal_ticket_id', ticketId)

    if (error) {
        console.error('Failed to fetch updated collaborators:', error)
        return []
    }
    return data as TicketCollaboratorWithProfile[]
}

export async function updateCollaborators(ticketId: string, newCollaboratorIds: string[]): Promise<Result> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
        return { success: false, message: "Not authenticated" };
    }

    try {
        // Fetch current collaborators
        const { data: existingCollaborators, error: fetchError } = await supabase
            .from('internal_ticket_collaborators')
            .select('user_id')
            .eq('internal_ticket_id', ticketId);
        
        if (fetchError) throw new Error(`Failed to fetch current collaborators: ${fetchError.message}`);

        const existingIds = existingCollaborators.map(c => c.user_id);
        
        const idsToAdd = newCollaboratorIds.filter(id => !existingIds.includes(id));
        const idsToRemove = existingIds.filter(id => !newCollaboratorIds.includes(id));
        
        // Add new collaborators. The trigger on the DB will handle notifications for additions.
        if (idsToAdd.length > 0) {
            const recordsToAdd = idsToAdd.map(userId => ({
                internal_ticket_id: ticketId,
                user_id: userId,
            }));
            const { error: addError } = await supabase.from('internal_ticket_collaborators').insert(recordsToAdd);
            if (addError) throw new Error(`Failed to add collaborators: ${addError.message}`);
        }
        
        // Remove old collaborators
        if (idsToRemove.length > 0) {
            const { error: removeError } = await supabase
                .from('internal_ticket_collaborators')
                .delete()
                .eq('internal_ticket_id', ticketId)
                .in('user_id', idsToRemove);
            if (removeError) throw new Error(`Failed to remove collaborators: ${removeError.message}`);
        }
        
        revalidatePath(`/dashboard/tickets/${ticketId}`);
        revalidatePath(`/dashboard`);
        const updatedCollaborators = await getUpdatedCollaborators(ticketId);
        return { success: true, message: "Collaborators updated successfully.", collaborators: updatedCollaborators };

    } catch (error: any) {
        console.error("Error updating collaborators:", error);
        return { success: false, message: error.message };
    }
}
