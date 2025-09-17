
import { BarChart3, Users } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/server';
import { getAgentPerformance, type AgentPerformanceData } from '@/app/dashboard/_actions/get-agent-performance';
import AnalyticsCharts from './_components/analytics-charts';
import { checkPermission } from '@/lib/helpers/permissions';
import { redirect } from 'next/navigation';

type Ticket = Database['public']['Tables']['internal_tickets']['Row'];

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const canView = await checkPermission('view_analytics');
  if (!canView) {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [ticketsResult, agentPerformanceResult] = await Promise.all([
    supabase.from('internal_tickets').select('*'),
    getAgentPerformance()
  ]);

  const { data: ticketsData, error } = ticketsResult;
  if (error) {
    console.error(error);
  }
  
  const tickets: Ticket[] = ticketsData || [];
  const agentPerformance: AgentPerformanceData[] = agentPerformanceResult || [];

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center gap-4">
            <div>
            <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" /> Ticket Analytics
            </h1>
            <p className="text-muted-foreground">
                Visualizing trends in your support tickets and agent performance.
            </p>
            </div>
        </div>

        <AnalyticsCharts tickets={tickets} agentPerformance={agentPerformance} />
    </main>
  );
}
