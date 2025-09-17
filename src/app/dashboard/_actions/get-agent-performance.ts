
'use server';

import { createClient } from '@/lib/supabase/server';

export interface AgentPerformanceData {
  agent_id: string;
  agent_name: string;
  agent_avatar_url: string | null;
  total_resolved: number;
  avg_resolution_time_minutes: number;
  sla_success_rate: number;
}

export async function getAgentPerformance(): Promise<AgentPerformanceData[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdminOrCeo = profile?.role === 'system_admin' || profile?.role === 'ceo';

  try {
    const { data: perfStats, error: perfError } = await supabase.rpc('get_agent_performance_stats');
    if (perfError) throw perfError;

    const { data: slaStats, error: slaError } = await supabase.rpc('get_agent_sla_success_rate');
    if (slaError) throw slaError;

    const slaMap = new Map((slaStats || []).map(s => [s.agent_id, s.sla_success_rate]));

    const combinedData = (perfStats || []).map(agent => ({
      ...agent,
      sla_success_rate: slaMap.get(agent.agent_id) ?? 100, // Default to 100% if no SLA data
    }));
    
    if (isAdminOrCeo) {
        return combinedData;
    }
    
    // For other roles, just return their own stats
    return combinedData.filter(d => d.agent_id === user.id);

  } catch (error) {
    console.error('Error fetching agent performance data:', error);
    return [];
  }
}
