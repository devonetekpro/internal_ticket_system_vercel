
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ChevronRight } from 'lucide-react';
import { getCrmTicketById, type UiCrmTicketDetails, getCrmCategories } from '@/services/crm-service';
import CrmTicketConversation from './_components/crm-ticket-conversation';
import CrmTicketDetailsCard from './_components/crm-ticket-details-card';
import { createClient } from '@/lib/supabase/server';
import CrmTicketHeaderActions from './_components/crm-ticket-header-actions';

export const dynamic = 'force-dynamic';

export default async function CrmTicketDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  const [ticket, categories] = await Promise.all([
    getCrmTicketById(params.id),
    getCrmCategories(),
  ]);

  if (!ticket) {
    return notFound();
  }

  return (
    <main className="flex-1 flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" className='self-start' size="icon" asChild>
          <Link href="/dashboard/crm-tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center text-sm text-muted-foreground mb-3">
            <Link href="/dashboard/crm-tickets" className="hover:underline">CRM Desk</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-medium text-foreground truncate max-w-xs">{ticket.title}</span>
          </div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            {ticket.title}
          </h1>
        </div>
        <CrmTicketHeaderActions ticket={ticket} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CrmTicketConversation initialTicket={ticket} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <CrmTicketDetailsCard initialTicket={ticket} categories={categories} />
        </div>
      </div>
    </main>
  );
}
