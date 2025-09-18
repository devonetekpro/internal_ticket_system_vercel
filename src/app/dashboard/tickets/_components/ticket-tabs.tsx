

'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Database } from '@/lib/database.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TicketList from './ticket-list'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import TicketFilters from './ticket-filters'
import PaginationControls from '@/components/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/components/providers/permissions-provider'
import type { TicketWithRelations, UserProfile } from '../page'
import { Button } from '@/components/ui/button'


const TicketListSkeleton = () => (
  <div className="border rounded-lg w-full">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]"><Skeleton className="h-5 w-5" /></TableHead>
          <TableHead className="w-[80px] hidden sm:table-cell">ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Priority</TableHead>
          <TableHead className="hidden xl:table-cell">Department(s)</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead className="hidden md:table-cell">Collaborators</TableHead>
          <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(10)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-5" /></TableCell>
            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><div className="flex flex-col gap-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></div></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="hidden xl:table-cell"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-24" /></div></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-20" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)

interface TicketTabsProps {
    initialTickets: TicketWithRelations[];
    initialTotalCount: number;
    allUsers: UserProfile[];
    currentUserProfile: UserProfile | null;
    counts: {
        my_tickets: number;
        department_tickets: number;
        collaboration_tickets: number;
        stale: number;
        all_tickets: number;
    };
}

export default function TicketTabs({ 
    initialTickets, 
    initialTotalCount, 
    allUsers, 
    currentUserProfile,
    counts,
}: TicketTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const rawSearchParams = useSearchParams();
    const searchParams = rawSearchParams ?? new URLSearchParams();
    const { hasPermission, isLoading: permissionsLoading } = usePermissions();
    const [isRefreshing, startTransition] = useTransition();

    // const [tickets, setTickets] = useState(initialTickets);
    // const [totalCount, setTotalCount] = useState(initialTotalCount);
    // const [counts, setCounts] = useState(initialCounts);
    // const [loading, setLoading] = useState(false);

    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const pageSize = searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 10;
    const tab = searchParams.get('tab') || 'my_tickets';

    // Update state when initial props change (due to server-side navigation)
    // useEffect(() => {
    //     setTickets(initialTickets);
    //     setTotalCount(initialTotalCount);
    //     setCounts(initialCounts);
    //     setLoading(false);
    // }, [initialTickets, initialTotalCount, initialCounts]);

    const handleTabChange = (newTab: string) => {
        // setLoading(true);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        params.set('page', '1'); // Reset to first page on view change
        router.push(`${pathname}?${params.toString()}`);
    }

    const handleRefresh = () => {
        startTransition(() => {
            router.replace(pathname + '?' + searchParams.toString());
        });
    };

    const tabs = [
        { value: 'my_tickets', label: 'My Tickets', count: counts.my_tickets },
        { value: 'department_tickets', label: 'Department', permission: 'view_all_tickets_in_department', count: counts.department_tickets },
        { value: 'collaboration_tickets', label: 'Collaborations', count: counts.collaboration_tickets },
        { value: 'stale', label: 'Stale', icon: AlertTriangle, permission: 'view_all_tickets_in_department', count: counts.stale },
        { value: 'all_tickets', label: 'All', permission: 'view_all_tickets_in_department', count: counts.all_tickets },
    ].filter(tab => !tab.permission || hasPermission(tab.permission as any));


    return (
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <div className="flex flex-col lg:flex-row sm:items-center lg:justify-between gap-4">
            <TabsList className="w-full lg:w-auto self-start overflow-x-auto lg:overflow-x-visible">
                {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="flex-1 sm:flex-initial flex items-center gap-2">
                    {t.icon && <t.icon className={`h-4 w-4 ${t.value === 'stale' && t.count > 0 ? 'text-amber-500' : ''}`} />}
                    {t.label}
                    {(t.value !== 'stale' || (t.value === 'stale' && t.count > 0)) && (
                        <Badge variant={t.value === tab ? 'default' : 'secondary'}>
                            {t.count}
                        </Badge>
                    )}
                </TabsTrigger>
                ))}
            </TabsList>
            <div className="w-full lg:w-auto  overflow-x-auto">
                <TicketFilters 
                    currentUserProfile={currentUserProfile} 
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                />
            </div>
            </div>
            <TabsContent value={tab} className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>{tabs.find(t => t.value === tab)?.label}</CardTitle>
                <CardDescription>
                    {tab === 'my_tickets' && 'Tickets created by or assigned to you.'}
                    {tab === 'department_tickets' && 'Tickets related to your department.'}
                    {tab === 'collaboration_tickets' && 'Tickets where you are a collaborator.'}
                    {tab === 'stale' && 'Open tickets that have not been updated in over 48 hours.'}
                    {tab === 'all_tickets' && 'All tickets you have permission to view.'}
                </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                {permissionsLoading || isRefreshing ? (
                    <TicketListSkeleton />
                    ) : (
                    <TicketList tickets={initialTickets} allUsers={allUsers} currentUserProfile={currentUserProfile} />
                    )}
                </CardContent>
                <CardFooter>
                <PaginationControls
                    totalCount={initialTotalCount}
                    pageSize={pageSize}
                    currentPage={page}
                    />
                </CardFooter>
            </Card>
            </TabsContent>
        </Tabs>
    )
}
