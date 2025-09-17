

import {
  File,
  PlusCircle,
  Ticket as TicketIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Database, Department, Profile as ProfileType } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TicketTabs from './_components/ticket-tabs'

export const dynamic = 'force-dynamic';

export type TicketWithRelations =
  Database['public']['Tables']['internal_tickets']['Row'] & {
    created_by_profile: Pick<
      ProfileType,
      'full_name' | 'avatar_url' | 'username' | 'email'
    > | null
    assigned_to_profile: Pick<
      ProfileType,
      'full_name' | 'avatar_url' | 'username' | 'email'
    > | null
    departments: { name: string }[]
    internal_ticket_departments: { department_id: string }[]
    internal_ticket_collaborators: { 
        user_id: string,
        profiles: {
            id: string;
            full_name: string | null;
            username: string | null;
            avatar_url: string | null;
        } | null
    }[]
  }
  
export type UserProfile = ProfileType & { email?: string }


export default async function TicketsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    
    if (!profile) {
        redirect('/login')
    }
    
    const page = Number(searchParams?.page || '1');
    const pageSize = Number(searchParams?.pageSize || '10');
    const tab = searchParams?.tab || 'my_tickets';
    const searchQuery = searchParams?.search || undefined;
    const status = searchParams?.status || undefined;
    const priority = searchParams?.priority || undefined;

    // --- Main Ticket Query ---
    let query = supabase
        .from('internal_tickets')
        .select(
          `
          *,
          created_by_profile:profiles!internal_tickets_created_by_fkey (full_name, avatar_url, username),
          assigned_to_profile:profiles!internal_tickets_assigned_to_fkey (full_name, avatar_url, username),
          internal_ticket_departments!inner(department_id, departments(name)),
          internal_ticket_collaborators!left(user_id, profiles(id, full_name, username, avatar_url))
        `, { count: 'exact' }
        )
    
    if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`)
    }
    if (status) {
        query = query.eq('status', status)
    }
    if (priority) {
        query = query.eq('priority', priority)
    }

    if (tab === 'my_tickets') {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (tab === 'department_tickets' && profile?.department_id) {
        query = query.eq('internal_ticket_departments.department_id', profile.department_id);
    } else if (tab === 'collaboration_tickets') {
        const { data: collabTickets, error: collabError } = await supabase.from('internal_ticket_collaborators').select('internal_ticket_id').eq('user_id', user.id);
        if (collabError || !collabTickets || collabTickets.length === 0) {
            query = query.in('id', []); // Effectively return no results
        } else {
            const ticketIds = collabTickets.map(ct => ct.internal_ticket_id);
            query = query.in('id', ticketIds);
        }
    } else if (tab === 'all_tickets') {
        if (profile?.role === 'manager' || profile?.role === 'department_head') {
            query = query.eq('internal_ticket_departments.department_id', profile.department_id);
        }
    } else if (tab === 'stale') {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        query = query.lt('updated_at', fortyEightHoursAgo).not('status', 'in', '("closed", "resolved")');
    }

    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;
    const rangedQuery = query.order('updated_at', { ascending: false }).range(from, to);

    // --- Parallel Data Fetching ---
    const [
        { data, error, count },
        { data: allUsersData },
        { count: myTicketsCount },
        { count: deptTicketsCount },
        { count: collabTicketsCount },
        { count: staleTicketsCount },
        { count: allTicketsCount }
    ] = await Promise.all([
        rangedQuery,
        supabase.from('profiles').select('*'),
        supabase.from('internal_tickets').select('*', { count: 'exact', head: true }).or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`),
        profile?.department_id ? supabase.from('internal_tickets').select('*, internal_ticket_departments!inner(department_id)', { count: 'exact', head: true }).eq('internal_ticket_departments.department_id', profile.department_id) : Promise.resolve({ count: 0 }),
        supabase.from('internal_tickets').select('*, internal_ticket_collaborators!inner(user_id)', { count: 'exact', head: true }).eq('internal_ticket_collaborators.user_id', user.id),
        supabase.from('internal_tickets').select('*', { count: 'exact', head: true }).lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()).not('status', 'in', '("closed", "resolved")'),
        (profile?.role === 'manager' || profile?.role === 'department_head') 
          ? (profile.department_id ? supabase.from('internal_tickets').select('*, internal_ticket_departments!inner(department_id)', { count: 'exact', head: true }).eq('internal_ticket_departments.department_id', profile.department_id) : Promise.resolve({ count: 0 }))
          : supabase.from('internal_tickets').select('*', { count: 'exact', head: true })
    ]);
    
    const formattedTickets = (data || []).map((t: any) => ({
        ...t,
        departments: t.internal_ticket_departments?.map((td: any) => td.departments).filter(Boolean) ?? [],
        internal_ticket_departments: t.internal_ticket_departments?.map((td: any) => ({ department_id: td.department_id })) ?? [],
    })) as TicketWithRelations[]

    const allUsers = (allUsersData as UserProfile[] ?? [])
    const counts = {
      my_tickets: myTicketsCount ?? 0,
      department_tickets: deptTicketsCount ?? 0,
      collaboration_tickets: collabTicketsCount ?? 0,
      stale: staleTicketsCount ?? 0,
      all_tickets: allTicketsCount ?? 0,
    };

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="grid gap-1">
                    <h1 className="font-headline text-3xl font-bold md:text-4xl">Internal Help Desk</h1>
                    <p className="text-muted-foreground">Manage all internal support tickets.</p>
                </div>
                <Button asChild size="lg">
                    <Link href="/dashboard/create-ticket">
                        <PlusCircle className="mr-2" />
                        Create Ticket
                    </Link>
                </Button>
            </div>
            
            <TicketTabs 
                initialTickets={formattedTickets}
                initialTotalCount={count ?? 0}
                allUsers={allUsers}
                currentUserProfile={profile}
                counts={counts}
            />
        </div>
    )
}
