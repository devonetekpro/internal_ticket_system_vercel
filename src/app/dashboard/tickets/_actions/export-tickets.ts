
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TicketWithRelations = Database['public']['Tables']['internal_tickets']['Row'] & {
  created_by_profile: Pick<Profile, 'full_name' | 'username'> | null;
  assigned_to_profile: Pick<Profile, 'full_name' | 'username'> | null;
  departments: { name: string }[];
};

type ExportFilters = {
  tab: string | null;
  search: string | null;
  status: string | null;
  priority: string | null;
};

// Helper function to escape CSV fields
const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);
  // If the field contains a comma, double quote, or newline, enclose it in double quotes
  if (/[",\n\r]/.test(stringField)) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

export async function exportTickets(filters: ExportFilters): Promise<{
  success: boolean;
  message?: string;
  csvData?: string;
}> {
  const supabase =  await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, message: 'User profile not found.' };
  }

  try {
    let query = supabase.from('internal_tickets').select(`
        *,
        created_by_profile:profiles!internal_tickets_created_by_fkey (full_name, username),
        assigned_to_profile:profiles!internal_tickets_assigned_to_fkey (full_name, username),
        departments:internal_ticket_departments!inner(departments(name))
    `);

    // Apply filters from the client
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Apply tab-based filters
    const activeTab = filters.tab || 'my_tickets';
    if (activeTab === 'my_tickets') {
      query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (activeTab === 'department_tickets' && profile.department_id) {
      query = query.eq('internal_ticket_departments.department_id', profile.department_id);
    } else if (activeTab === 'collaboration_tickets') {
      const { data: collabTickets } = await supabase.from('internal_ticket_collaborators').select('internal_ticket_id').eq('user_id', user.id);
      const ticketIds = collabTickets?.map(ct => ct.internal_ticket_id) ?? [];
      if (ticketIds.length > 0) {
        query = query.in('id', ticketIds);
      } else {
        // No collaboration tickets, return empty result
        return { success: true, csvData: "ID,Title,Status,Priority,Category,Creator,Assignee,Departments,Created At,Updated At\n" };
      }
    } else if (activeTab === 'all_tickets') {
      if (profile.role === 'manager' || profile.role === 'department_head') {
        query = query.eq('internal_ticket_departments.department_id', profile.department_id);
      }
    } else if (activeTab === 'stale') {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      query = query.lt('updated_at', fortyEightHoursAgo).not('status', 'in', '("closed", "resolved")');
    }

    const { data: tickets, error } = await query;
    if (error) throw error;

    const headers = [
      'ID', 'Title', 'Status', 'Priority', 'Category', 
      'Creator', 'Assignee', 'Departments', 'Created At', 'Updated At'
    ];

    const rows = (tickets as any[]).map(ticket => [
      ticket.id,
      ticket.title,
      ticket.status,
      ticket.priority,
      ticket.category,
      ticket.created_by_profile?.full_name ?? 'N/A',
      ticket.assigned_to_profile?.full_name ?? 'Unassigned',
      (ticket.departments?.map((d: any) => d.departments.name) ?? []).join(', '),
      ticket.created_at,
      ticket.updated_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    return { success: true, csvData: csvContent };

  } catch (error: any) {
    console.error('Error exporting tickets:', error);
    return { success: false, message: 'An error occurred during export.' };
  }
}
