

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { TicketForm } from '@/components/ticket-form';

export const dynamic = 'force-dynamic'

export default async function EditTicketPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: ticket, error } = await supabase
    .from('internal_tickets')
    .select(`
        *,
        collaborators:internal_ticket_collaborators(user_id),
        internal_ticket_departments(department_id)
    `)
    .eq('id', params.id)
    .single();

  if (error || !ticket) {
    notFound();
  }
  
  const formattedTicket = {
    ...ticket,
    collaborators: ticket.collaborators.map((c: any) => ({ user_id: c.user_id })),
    ticket_departments: ticket.internal_ticket_departments.map((d: any) => ({ department_id: d.department_id })),
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/tickets/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <Edit className="h-7 w-7 text-primary" /> Edit Ticket
          </h1>
          <p className="text-muted-foreground">
            Modify the details of ticket #{ticket.id.substring(0, 8)}
          </p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
        <div></div>
        <div className="flex flex-col gap-4">
            <TicketForm mode="edit" ticket={formattedTicket as any} />
        </div>
      </div>
    </main>
  );
}
