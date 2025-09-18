

import { MessageSquare, PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getCrmTickets, getCrmManagers, type CrmManager } from '@/services/crm-service';
import CrmTicketTabs from './_components/crm-ticket-tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { checkPermission } from '@/lib/helpers/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const CrmPageSkeleton = () => (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
        <div className="flex items-center">
            <div className="grid gap-1">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-72" />
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-10 w-36" />
            </div>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    </div>
);


async function CrmPageContent({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const canAccess = await checkPermission('access_crm_tickets');
  if (!canAccess) {
    redirect('/dashboard?error=unauthorized');
  }

  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const view = typeof searchParams.view === 'string' ? searchParams.view : 'opened';
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const errorParam = typeof searchParams.error === 'string' ? searchParams.error : undefined;

  const [ticketData, crmManagers] = await Promise.all([
    getCrmTickets({ page, pageSize: PAGE_SIZE, view, status, search }),
    getCrmManagers()
  ]);

  const managerMap = new Map<string, string>();
  crmManagers.forEach((manager: CrmManager) => {
    managerMap.set(manager.id.toString(), manager.fullName);
  });

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 md:p-6">
      <div className="flex items-center flex-wrap justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            CRM Desk
          </h1>
          <p className="text-muted-foreground">Manage all client-facing tickets and communications.</p>
        </div>
         <div className=" flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/crm-tickets/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New CRM Ticket
            </Link>
          </Button>
        </div>
      </div>
      
      {errorParam === 'unauthorized_crm_creation' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Your HelpFlow account is not linked to a CRM Manager profile. Please contact an administrator to get this set up before you can create CRM tickets.
          </AlertDescription>
        </Alert>
      )}

      <CrmTicketTabs
        initialData={ticketData}
        managers={managerMap}
      />
    </main>
  )
}

export default async function CrmTicketsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    return (
        <Suspense fallback={<CrmPageSkeleton />}>
            <CrmPageContent searchParams={searchParams} />
        </Suspense>
    );
}
