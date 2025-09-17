

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCrmTicketForm } from '../_components/new-crm-ticket-form';
import { getCrmCategories } from '@/services/crm-service';
import 'use-debounce';


export default async function NewCrmTicketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role, crm_manager_id').eq('id', user.id).single();
  
  // Also check if they have a crm_manager_id, otherwise they can't create tickets
  if (!profile || !['system_admin', 'agent', 'ceo'].includes(profile.role ?? '') || !profile.crm_manager_id) {
    redirect('/dashboard/crm-tickets?error=unauthorized_crm_creation');
  }
  
  const categories = await getCrmCategories();

  return (
    <main className="flex-1 flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/crm-tickets">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    New CRM Ticket
                </h1>
                <p className="text-muted-foreground">Create a new ticket for a client.</p>
            </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <NewCrmTicketForm categories={categories} currentUserProfile={profile}/>
        </div>
    </main>
  );
}
