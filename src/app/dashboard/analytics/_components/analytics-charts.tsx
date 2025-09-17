
'use client'

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { type AgentPerformanceData } from '@/app/dashboard/_actions/get-agent-performance';

type Ticket = Database['public']['Tables']['internal_tickets']['Row'];
type AnalyticsChartsProps = {
    tickets: Ticket[];
    agentPerformance: AgentPerformanceData[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const AgentPerformanceTableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Tickets Resolved</TableHead>
                <TableHead>Avg. Resolution Time</TableHead>
                <TableHead>SLA Success</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-5 w-24" /></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Skeleton className="w-full h-full" />
  </div>
);


export default function AnalyticsCharts({ tickets, agentPerformance }: AnalyticsChartsProps) {
  
  const ticketStatusData = useMemo(() => {
    if (!tickets) return [];
    return tickets.reduce((acc, ticket) => {
      const status = ticket.status.replace(/_/g, ' ');
      const existing = acc.find(item => item.name === status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ name: status, count: 1 });
      }
      return acc;
    }, [] as { name: string, count: number }[]);
  }, [tickets]);

  const ticketPriorityData = useMemo(() => {
    if (!tickets) return [];
    return tickets.reduce((acc, ticket) => {
      const priority = ticket.priority;
      const existing = acc.find(item => item.name === priority);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ name: priority, count: 1 });
      }
      return acc;
    }, [] as { name: string, count: number }[]);
  }, [tickets]);
  
    const ticketCategoryData = useMemo(() => {
    if (!tickets) return [];
    return tickets.reduce((acc, ticket) => {
      const category = ticket.category ?? 'Uncategorized';
      const existing = acc.find(item => item.name === category);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ name: category, count: 1 });
      }
      return acc;
    }, [] as { name: string, count: number }[]);
  }, [tickets]);
  
  const formatMinutes = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const isLoading = !tickets || !agentPerformance;

  return (
    <>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Agent Performance</CardTitle>
                <CardDescription>Key performance indicators for support agents.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <AgentPerformanceTableSkeleton /> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Agent</TableHead>
                                <TableHead>Tickets Resolved</TableHead>
                                <TableHead>Avg. Resolution Time</TableHead>
                                <TableHead className="text-right">SLA Success Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agentPerformance.map(agent => (
                                <TableRow key={agent.agent_id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={agent.agent_avatar_url ?? ''}/>
                                                <AvatarFallback>{getInitials(agent.agent_name, '')}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{agent.agent_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{agent.total_resolved}</TableCell>
                                    <TableCell>{formatMinutes(agent.avg_resolution_time_minutes)}</TableCell>
                                    <TableCell className="text-right">{agent.sla_success_rate.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                             {agentPerformance.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No agent performance data available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Tickets by Status</CardTitle>
                    <CardDescription>Distribution of tickets across different statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <ChartSkeleton /> : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={ticketStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {ticketStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip
                                    contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tickets by Priority</CardTitle>
                    <CardDescription>How tickets are spread across priority levels.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <ChartSkeleton /> : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={ticketPriorityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {ticketPriorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip
                                    contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle>Tickets by Category</CardTitle>
                    <CardDescription>Volume of tickets per category.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <ChartSkeleton /> : (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={ticketCategoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    }}
                                />
                                <Bar dataKey="count" name="Ticket Count">
                                    {ticketCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    </>
  );
}
