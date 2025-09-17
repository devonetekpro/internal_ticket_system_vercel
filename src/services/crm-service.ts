

'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripHtml } from "string-strip-html";

// Use environment variables for the CRM API credentials
const CRM_API_BASE_URL = process.env.CRM_API_BASE_URL;
const CRM_API_KEY = process.env.CRM_API_KEY;

// This is the shape of the ticket data coming from the /rest/help-desk/tickets API
export interface CrmTicketFromApi {
    id: number;
    category: string;
    user: number;
    manager: number;
    title: string;
    status: string;
    comments: CrmCommentFromApi[];
    createdAt: string;
    updatedAt: string;
}

export interface CrmCommentFromApi {
    id: number;
    ticket: number;
    user: number;
    manager: number;
    text: string;
    attachments: {
        id: string;
        name: string;
        path: string;
    }[];
    isPrivate: boolean;
    isViewedByClient: boolean;
    createdAt: string;
}

export interface CrmCategory {
    id: number;
    title: string;
    priority: number;
}

export interface CrmUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
}

export interface CrmManager {
    id: number;
    fullName: string;
    phone: string;
    email: string;
    skype: string;
    active: boolean;
}


// This is the shape of the data the UI component expects for the list view
export interface UiCrmTicket {
    id: string;
    crm_id: string;
    title: string;
    status: string;
    client_id: string;
    createdAt: string;
    category: string;
    updatedAt: string;
    managerId: string | null;
}

export type CrmTicketView = 'all' | 'opened' | 'opened_today' | 'waiting_for_response' | 'closed';

export type PaginatedCrmTickets = {
    tickets: UiCrmTicket[];
    totalCount: number;
    counts: Record<CrmTicketView, number>;
}


export type UiComment = {
    id: number;
    text: string;
    author: 'Client' | 'Manager';
    authorName: string;
    authorId: string;
    createdAt: string;
    isPrivate: boolean;
    isViewedByClient: boolean;
    attachments: { name: string; file: string; }[];
};

// This is the shape of the data the UI component expects for the detail view
export interface UiCrmTicketDetails extends UiCrmTicket {
    comments: UiComment[];
}

interface GetCrmTicketsParams {
    page?: number;
    pageSize?: number;
    view?: CrmTicketView;
    status?: string;
    search?: string;
}

export async function getCrmApiKey() {
    return CRM_API_KEY;
}

// Helper function to safely parse JSON
async function safeJsonParse(response: Response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        return null;
    }
}

/**
 * Fetches tickets from the external CRM, stores/updates them in the local database,
 * and then returns the tickets from the local database.
 * This function now performs a delta sync to only fetch new or updated tickets.
 */
export async function getCrmTickets({ page = 1, pageSize = 20, view = 'opened', status, search }: GetCrmTicketsParams = {}): Promise<PaginatedCrmTickets> {
    const supabase = await createClient();
    
    if (!CRM_API_BASE_URL || !CRM_API_KEY) {
        console.warn("CRM API URL or Key is not configured. Falling back to local cache.");
    } else {
        try {
            const { count: localTicketCount } = await supabase
                .from('crm_tickets')
                .select('*', { count: 'exact', head: true });

            const isInitialSync = (localTicketCount || 0) === 0;
            // Aggressive sync: fetch more tickets to build up the local backup
            const syncLimit = isInitialSync ? 500 : 50;
            
            const requestBody: any = {
                orders: [{ "field": "updatedAt", "direction": "DESC" }],
                segment: { limit: syncLimit, offset: 0 } 
            };

            const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRM_API_KEY}` },
                body: JSON.stringify(requestBody) 
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`CRM API Error: ${response.status} ${response.statusText}`, errorBody);
                throw new Error('Failed to fetch tickets from CRM API.');
            }

            const apiTickets: CrmTicketFromApi[] | null = await safeJsonParse(response);
            
            if (apiTickets && apiTickets.length > 0) {
                 const ticketsToUpsert = apiTickets.map(ticket => ({
                    crm_id: ticket.id.toString(),
                    title: ticket.title,
                    status: ticket.status,
                    category: ticket.category,
                    client_id: ticket.user.toString(),
                    assigned_to: ticket.manager ? ticket.manager.toString() : null,
                    updated_at: ticket.updatedAt,
                    description: ticket.comments?.[0]?.text ?? ticket.title,
                    created_at: ticket.createdAt,
                }));
                const { error: upsertError } = await supabase
                    .from('crm_tickets')
                    .upsert(ticketsToUpsert, { onConflict: 'crm_id' });

                if (upsertError) {
                    console.error('Error upserting CRM tickets to local DB:', upsertError);
                    throw new Error('Failed to save tickets locally.');
                }
            }
        } catch (error) {
            console.error('Error fetching and syncing CRM tickets:', error);
        }
    }

    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;

    let query = supabase.from('crm_tickets').select('*', { count: 'exact' });

    // Apply search filter first
    if (search) {
        query = query.or(`title.ilike.%${search}%,crm_id.eq.${search},client_id.eq.${search}`);
    }
    
    // Apply status filter if provided, otherwise apply view filter
    if (status) {
        const statusList = status.split(',');
        query = query.in('status', statusList);
    } else if (!search) { // Don't apply view filter if a search is active
        if (view === 'opened') {
            query = query.in('status', ['open', 'in_progress', 'pending support', 'pending client']);
        } else if (view === 'opened_today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query = query.gte('created_at', today.toISOString()).in('status', ['open', 'in_progress', 'pending support', 'pending client']);
        } else if (view === 'waiting_for_response') {
            query = query.eq('status', 'pending support');
        } else if (view === 'closed') {
            query = query.in('status', ['closed', 'resolved']);
        }
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: ticketsData, error: fetchError, count: totalCount } = await query;
    if (fetchError) {
        console.error('Error fetching from local crm_tickets table:', fetchError);
        return { tickets: [], totalCount: 0, counts: { all: 0, opened: 0, opened_today: 0, waiting_for_response: 0, closed: 0 } };
    }

    // Fetch counts for all tabs
    const { data: allCountsData, error: countsError } = await supabase.rpc('get_crm_ticket_counts');
    
    let counts: Record<CrmTicketView, number> = { all: 0, opened: 0, opened_today: 0, waiting_for_response: 0, closed: 0 };

    if (countsError) {
        console.error('Error fetching ticket counts:', countsError);
    } else if (allCountsData && allCountsData.length > 0) {
        const result = allCountsData[0];
        counts = {
            all: result.all_count,
            opened: result.opened_count,
            opened_today: result.opened_today_count,
            waiting_for_response: result.waiting_for_response_count,
            closed: result.closed_count
        };
    }


    const mappedTickets = (ticketsData || []).map(ticket => ({
        id: ticket.id,
        crm_id: ticket.crm_id,
        title: ticket.title,
        status: ticket.status,
        category: ticket.category ?? 'N/A',
        client_id: ticket.client_id ?? '',
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        managerId: ticket.assigned_to,
    }));

    return { tickets: mappedTickets, totalCount: totalCount ?? 0, counts };
}

export async function getCrmCategories(): Promise<CrmCategory[]> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) {
        console.warn("CRM API URL or Key is not configured. Returning empty array.");
        return [];
    }
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
            body: JSON.stringify({
                orders: [{ field: "id", direction: "DESC" }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error fetching categories: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to fetch categories from CRM API.');
        }

        const data = await safeJsonParse(response);
        if (data && Array.isArray(data.categories)) {
            return data.categories;
        } else {
            console.warn("CRM categories API did not return an object with a 'categories' array, returning empty array.");
            return [];
        }
    } catch (error) {
        console.error('Error fetching and processing CRM categories:', error);
        return [];
    }
}

export async function getCrmManagers(): Promise<CrmManager[]> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) {
        console.warn("CRM API URL or Key is not configured for managers. Returning empty array.");
        return [];
    }
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/managers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error fetching managers: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to fetch managers from CRM API.');
        }

        const data = await safeJsonParse(response);
        return data as CrmManager[] || [];
    } catch (error) {
        console.error('Error fetching and processing CRM managers:', error);
        return [];
    }
}

export async function getCrmTicketById(crmId: string): Promise<UiCrmTicketDetails | null> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return null;
    try {
        const ticketResponse = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${crmId}`, {
            headers: { 'Authorization': `Bearer ${CRM_API_KEY}` },
        });

        if (!ticketResponse.ok) {
            console.error(`Failed to fetch ticket ${crmId} from CRM API:`, await ticketResponse.text());
            return null;
        }

        const ticketData: CrmTicketFromApi | null = await safeJsonParse(ticketResponse);
        if (!ticketData) return null;
        
        const [commentsResponse, managers, clientResult] = await Promise.all([
             fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRM_API_KEY}` },
                body: JSON.stringify({ ticketIds: [parseInt(crmId, 10)], orders: [{ field: "createdAt", direction: "ASC" }] })
            }),
            getCrmManagers(),
            searchCrmUserById(ticketData.user.toString())
        ]);
        
        const apiComments: CrmCommentFromApi[] = commentsResponse.ok ? (await safeJsonParse(commentsResponse) || []) : [];
        const managerNames = new Map(managers.map(m => [m.id.toString(), m.fullName]));
        const clientName = clientResult.length > 0 ? `${clientResult[0].firstName} ${clientResult[0].lastName}` : `Client #${ticketData.user}`;

        const processedComments: UiComment[] = await Promise.all(apiComments.map(async (comment) => {
            const isManagerComment = !!comment.manager;
            const authorId = isManagerComment && comment.manager ? comment.manager.toString() : (comment.user ? comment.user.toString() : '0');
            const rawAuthorName = isManagerComment ? (managerNames.get(authorId) ?? `Manager`) : clientName;
            const authorName = `${rawAuthorName} (ID: ${authorId})`;

            const attachments = await Promise.all((comment.attachments || []).map(async (att) => {
                let fileDataUri = '';
                if (!CRM_API_KEY || !att.path) return { name: att.name, file: '' };

                try {
                    const imageResponse = await fetch(att.path, {
                        headers: { Authorization: `Bearer ${CRM_API_KEY}` },
                    });

                    if (imageResponse.ok) {
                        const buffer = await imageResponse.arrayBuffer();
                        const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
                        fileDataUri = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
                    } else {
                        console.error(`Failed to fetch attachment: ${att.path}, Status: ${imageResponse.status}`);
                    }
                } catch (e) {
                    console.error(`Error processing attachment ${att.name}:`, e);
                }
                return { name: att.name, file: fileDataUri };
            }));

            return {
                id: comment.id,
                text: comment.text,
                author: isManagerComment ? 'Manager' : 'Client',
                authorId: authorId,
                authorName,
                createdAt: comment.createdAt,
                isPrivate: comment.isPrivate,
                isViewedByClient: comment.isViewedByClient,
                attachments,
            };
        }));


        return {
            id: crmId,
            crm_id: ticketData.id.toString(),
            title: ticketData.title,
            status: ticketData.status,
            category: ticketData.category,
            client_id: ticketData.user.toString(),
            createdAt: ticketData.createdAt,
            updatedAt: ticketData.updatedAt,
            managerId: ticketData.manager ? ticketData.manager.toString() : null,
            comments: processedComments,
        };

    } catch (error) {
        console.error(`Error fetching and processing CRM ticket ${crmId}:`, error);
        return null;
    }
}


export async function addCrmTicketComment(
    ticketId: string, 
    commentText: string, 
    isPrivate: boolean,
    attachment?: { name: string, file: string }
): Promise<UiComment | null> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return null;
    
    const replyText = stripHtml(commentText).result;
    
    // If there's no actual new text after removing the quote, don't send.
    if (!replyText && !attachment) {
      // You might want to return an error or a specific status here
      throw new Error("Cannot send an empty reply.");
    }
    
    const managerIdForCrm = 8;
    
    try {
        const requestBody: any = {
            user: 0,
            manager: managerIdForCrm,
            text: replyText,
            attachments: [],
            isPrivate: isPrivate
        };

        if (attachment) {
            requestBody.attachments.push(attachment);
        }

        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error for adding comment to ticket ${ticketId}: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to post comment via CRM API.');
        }

        const newCommentData: CrmCommentFromApi | null = await safeJsonParse(response);
        if (!newCommentData) return null;
        
        const allManagers = await getCrmManagers();
        const managerInfo = allManagers.find(m => m.id === managerIdForCrm);
        const managerName = managerInfo ? managerInfo.fullName : `Manager`;
        
        const managerNameWithId = `${managerName} (ID: ${managerIdForCrm})`;
        
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const newAttachments = await Promise.all((newCommentData.attachments || []).map(async (att) => {
             let fileDataUri = '';
            if (!CRM_API_KEY || !att.path) return { name: att.name, file: '' };
            try {
                const imageResponse = await fetch(att.path, {
                    headers: { Authorization: `Bearer ${CRM_API_KEY}` },
                });
                if (imageResponse.ok) {
                    const buffer = await imageResponse.arrayBuffer();
                    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
                    fileDataUri = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
                }
            } catch (e) { console.error(e) }
            return { name: att.name, file: fileDataUri };
        }));

        return {
            id: newCommentData.id,
            text: newCommentData.text,
            author: 'Manager',
            authorId: user.id,
            authorName: managerNameWithId,
            createdAt: newCommentData.createdAt,
            isPrivate: newCommentData.isPrivate,
            isViewedByClient: newCommentData.isViewedByClient,
            attachments: newAttachments
        };

    } catch (error) {
        console.error(`Error posting comment to CRM ticket ${ticketId}:`, error);
        return null;
    }
}

export async function updateCrmTicket(ticketId: string, updateData: { status?: string; category?: string; }): Promise<{ success: boolean; message: string; updatedTicket?: any; }> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return { success: false, message: "CRM API not configured." };
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error updating ticket ${ticketId}: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to update ticket via CRM API.');
        }

        const updatedTicket = await safeJsonParse(response);

        const supabase = await createClient();
        const { error: upsertError } = await supabase
            .from('crm_tickets')
            .update({ 
                status: updatedTicket.status, 
                category: updatedTicket.category,
                updated_at: updatedTicket.updatedAt 
            })
            .eq('crm_id', ticketId);
        
        if (upsertError) {
            console.warn(`Failed to sync status for CRM ticket ${ticketId}:`, upsertError.message);
        }

        return { success: true, message: "Ticket updated successfully.", updatedTicket };

    } catch (error: any) {
        console.error(`Error updating CRM ticket for ticket ${ticketId}:`, error);
        return { success: false, message: error.message };
    }
}


export async function deleteCrmTicket(formData: FormData): Promise<{ success: boolean; message: string; }> {
    const ticketId = formData.get('ticketId') as string;
    if (!ticketId) {
        return { success: false, message: "Ticket ID is missing." };
    }

    if (!CRM_API_BASE_URL || !CRM_API_KEY) return { success: false, message: "CRM API not configured." };
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${CRM_API_KEY}`
            }
        });

        if (response.status === 204 || response.ok) {
            const supabase = await createClient();
            const { error: dbError } = await supabase.from('crm_tickets').delete().eq('crm_id', ticketId);
            if (dbError) {
                console.warn(`Failed to delete ticket ${ticketId} from local database:`, dbError.message);
            }
            
            const { error: linkError } = await supabase.from('ticket_links').delete().eq('crm_ticket_id', ticketId);
             if (linkError) {
                console.warn(`Failed to delete ticket links for ${ticketId} from local database:`, linkError.message);
            }
            
            revalidatePath('/dashboard/crm-tickets');
            return { success: true, message: "Ticket deleted successfully." };
        }
        
        const errorBody = await response.text();
        console.error(`CRM API Error deleting ticket ${ticketId}: ${response.status} ${response.statusText}`, errorBody);
        throw new Error('Failed to delete ticket via CRM API.');

    } catch (error: any) {
        console.error(`Error deleting CRM ticket ${ticketId}:`, error);
        return { success: false, message: error.message };
    }
}

export async function updateCrmComment(ticketId: string, commentId: string, newText: string): Promise<UiComment | null> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return null;
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
            body: JSON.stringify({ text: newText })
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error updating comment ${commentId}: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to update comment via CRM API.');
        }
        
        const updatedCommentData: CrmCommentFromApi | null = await safeJsonParse(response);
        if (!updatedCommentData) return null;
        
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase.from('profiles').select('crm_manager_id, full_name, username').eq('id', user.id).single();
        if (!profile) throw new Error("Profile not found");

        const managerName = `${profile.full_name ?? profile.username} (ID: ${profile.crm_manager_id})`;
        const newAttachments = await Promise.all((updatedCommentData.attachments || []).map(async (att) => {
            let fileDataUri = '';
            if (!CRM_API_KEY || !att.path) return { name: att.name, file: '' };
            try {
                const imageResponse = await fetch(att.path, {
                    headers: { Authorization: `Bearer ${CRM_API_KEY}` },
                });
                if (imageResponse.ok) {
                    const buffer = await imageResponse.arrayBuffer();
                    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
                    fileDataUri = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
                }
            } catch (e) { console.error(e) }
            return { name: att.name, file: fileDataUri };
        }));

        return {
            id: updatedCommentData.id,
            text: updatedCommentData.text,
            author: 'Manager',
            authorName: managerName,
            authorId: user.id,
            createdAt: updatedCommentData.createdAt,
            isPrivate: updatedCommentData.isPrivate,
            isViewedByClient: updatedCommentData.isViewedByClient,
            attachments: newAttachments
        };

    } catch (error) {
        console.error(`Error updating comment ${commentId} on ticket ${ticketId}:`, error);
        return null;
    }
}


export async function deleteCrmComment(ticketId: string, commentId: string): Promise<{ success: boolean; message: string; }> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return { success: false, message: "CRM API not configured." };
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${CRM_API_KEY}`
            },
        });

        if (response.status === 204 || response.ok) {
             return { success: true, message: "Comment deleted successfully." };
        }
        
        const errorBody = await response.text();
        console.error(`CRM API Error deleting comment ${commentId}: ${response.status} ${response.statusText}`, errorBody);
        throw new Error('Failed to delete comment via CRM API.');

    } catch (error: any) {
        console.error(`Error deleting comment ${commentId} on ticket ${ticketId}:`, error);
        return { success: false, message: error.message };
    }
}

export async function closeCrmTicket(ticketId: string): Promise<{ success: boolean; message: string; updatedTicket?: any; }> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) return { success: false, message: "CRM API not configured." };
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/${ticketId}/close`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CRM_API_KEY}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error closing ticket ${ticketId}: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to close ticket via CRM API.');
        }

        const updatedTicket = await safeJsonParse(response);
        
        const supabase = await createClient();
        const { error: upsertError } = await supabase
            .from('crm_tickets')
            .update({ 
                status: updatedTicket.status, 
                updated_at: updatedTicket.updatedAt 
            })
            .eq('crm_id', ticketId);
        
        if (upsertError) {
            console.warn(`Failed to sync status for closed CRM ticket ${ticketId}:`, upsertError.message);
        }

        return { success: true, message: "Ticket closed successfully.", updatedTicket };
    } catch (error: any) {
        console.error(`Error closing CRM ticket for ticket ${ticketId}:`, error);
        return { success: false, message: error.message };
    }
}

type CreateCrmTicketData = {
    user: number;
    manager: number;
    title: string;
    text: string;
    category: string;
    attachmentName?: string;
    attachmentFile?: string; // base64
};

export async function createCrmTicket(data: CreateCrmTicketData) {
  if (!CRM_API_BASE_URL || !CRM_API_KEY) {
    throw new Error('CRM API not configured.');
  }

  const requestBody: any = {
    user: data.user,
    manager: data.manager,
    status: 'pending support',
    title: data.title,
    text: stripHtml(data.text).result,
    category: data.category,
    attachments: [],
  };

  if (data.attachmentName && data.attachmentFile) {
    requestBody.attachments.push({
      name: data.attachmentName,
      file: data.attachmentFile,
    });
  }

  const response = await fetch(`${CRM_API_BASE_URL}/rest/help-desk/tickets/new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRM_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`CRM API Error creating ticket: ${response.status} ${response.statusText}`, errorBody);
    throw new Error('Failed to create ticket via CRM API.');
  }

  const newTicket = await safeJsonParse(response);
  if (!newTicket) return null;
  
  // Also add the new ticket to our local database to keep it in sync
  const supabase = await createClient();
  const { error: upsertError } = await supabase
    .from('crm_tickets')
    .upsert({
        crm_id: newTicket.id.toString(),
        title: newTicket.title,
        status: newTicket.status,
        category: newTicket.category,
        client_id: newTicket.user.toString(),
        assigned_to: newTicket.manager ? newTicket.manager.toString() : null,
        created_at: newTicket.createdAt,
        updated_at: newTicket.updatedAt,
        description: newTicket.comment.text ?? newTicket.title,
    }, { onConflict: 'crm_id' });
    
    if (upsertError) {
        console.warn(`Failed to sync newly created CRM ticket ${newTicket.id}:`, upsertError.message);
    }
    
    revalidatePath('/dashboard/crm-tickets');

  return newTicket;
}

async function fetchCrmUsers(requestBody: any): Promise<CrmUser[]> {
    if (!CRM_API_BASE_URL || !CRM_API_KEY) {
        console.warn("CRM API URL or Key is not configured. Returning empty array.");
        return [];
    }
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/rest/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRM_API_KEY}` },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`CRM API Error fetching users: ${response.status} ${response.statusText}`, errorBody);
            throw new Error('Failed to fetch users from CRM API.');
        }
        
        const rawResponse = await safeJsonParse(response);
        let users: any[] = [];
        
        // Handle different response structures
        if (Array.isArray(rawResponse)) {
             if (rawResponse.length > 0 && Array.isArray(rawResponse[0]) && requestBody.ids) {
                 users = rawResponse[0];
            } else if (rawResponse.length > 0 && requestBody.expression) {
                // For expression search, it seems to be a direct array of users
                users = rawResponse;
            } else if (rawResponse.length === 2 && Array.isArray(rawResponse[1])) {
                users = rawResponse[1];
            } else {
                users = rawResponse;
            }
        }


        if (users && users.length > 0) {
            return users.map(user => ({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }));
        } else {
            console.warn("CRM users API did not return an array in the expected format, returning empty array.");
            return [];
        }
    } catch (error) {
        console.error('Error fetching and processing CRM users:', error);
        return [];
    }
}


export async function searchCrmUserById(id: string): Promise<CrmUser[]> {
    const requestBody = { ids: [id] };
    return fetchCrmUsers(requestBody);
}

export async function searchCrmUsersByExpression(expression: string): Promise<CrmUser[]> {
    const requestBody = { expression: expression, orders: [{field: 'id', direction: 'DESC'}], segment: { limit: 10 } };
    return fetchCrmUsers(requestBody);
}
