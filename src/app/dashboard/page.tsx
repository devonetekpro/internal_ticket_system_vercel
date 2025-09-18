"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  DollarSign,
  Users,
  Ticket,
  RefreshCcw,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/database.types";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TicketWithRelations =
  Database["public"]["Tables"]["internal_tickets"]["Row"] & {
    created_by_profile: Pick<
      Profile,
      "full_name" | "username" | "email"
    > | null;
  };

type ActivityEvent = {
  id: string;
  created_at: string;
  content: string;
  ticket_id: string | null;
  ticket_title: string | null;
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    myOpenTickets: 0,
  });
  const [recentTickets, setRecentTickets] = useState<TicketWithRelations[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, startTransition] = useTransition();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect("/login");
      return;
    }
    setUser(currentUser);

    // Get collaborator ticket IDs first as they are needed for multiple queries
    const { data: collaboratorTickets } = await supabase
      .from("internal_ticket_collaborators")
      .select("internal_ticket_id")
      .eq("user_id", currentUser.id);

    const collaboratorTicketIds =
      collaboratorTickets?.map((ct) => ct.internal_ticket_id) ?? [];
    const userTicketsFilter = `created_by.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`;
    const fullUserFilter =
      collaboratorTicketIds.length > 0
        ? `${userTicketsFilter},id.in.(${collaboratorTicketIds.join(",")})`
        : userTicketsFilter;

    let totalTicketsQuery = supabase
      .from("internal_tickets")
      .select("*", { count: "exact", head: true });
    let openTicketsQuery = supabase
      .from("internal_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    let closedTicketsQuery = supabase
      .from("internal_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "closed");

    // This is the main change: Apply user-specific filter to recent tickets query
    let recentTicketsQuery = supabase
      .from("internal_tickets")
      .select(
        `
          *,
          created_by_profile:profiles!internal_tickets_created_by_fkey(full_name, username)
      `
      )
      .or(fullUserFilter)
      .limit(5)
      .order("created_at", { ascending: false });

    let recentActivityQuery = supabase
      .from("ticket_comments")
      .select(
        `
        id,
        created_at,
        content,
        ticket_id: internal_ticket_id,
        ticket:internal_tickets ( id, title ),
        profile:profiles (full_name, username, avatar_url)
      `
      )
      .order("created_at", { ascending: false })
      .limit(5);

    // Filter stats for non-admins
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    const userRole = profile?.role ?? "user";
    const isAdminOrManager = [
      "system_admin",
      "admin",
      "manager",
      "department_head",
      "ceo",
      "super_admin",
    ].includes(userRole);

    if (!isAdminOrManager) {
      totalTicketsQuery = totalTicketsQuery.or(fullUserFilter);
      openTicketsQuery = openTicketsQuery.or(fullUserFilter);
      closedTicketsQuery = closedTicketsQuery.or(fullUserFilter);
      recentActivityQuery = recentActivityQuery.or(fullUserFilter, { referencedTable: 'ticket' });
    }

   const [
      { count: totalTickets },
      { count: openTickets },
      { count: closedTickets },
      { data: recentTicketsData },
      { data: recentActivityData },
      { count: myOpenTickets }
    ] = await Promise.all([
      totalTicketsQuery,
      openTicketsQuery,
      closedTicketsQuery,
      recentTicketsQuery,
      recentActivityQuery,
      supabase.from('internal_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('assigned_to', currentUser.id)
    ]);

    setStats({
      totalTickets: totalTickets ?? 0,
      openTickets: openTickets ?? 0,
      closedTickets: closedTickets ?? 0,
      myOpenTickets: myOpenTickets ?? 0,
    });

    setRecentTickets(recentTicketsData || []);
    setRecentActivity(
      (recentActivityData || []).map((item: any) => ({
        ...item,
        ticket_title: item.ticket?.title,
      }))
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    startTransition(() => {
      fetchData();
    });
  };

  const renderActivityMessage = (activity: ActivityEvent) => {
    const userName =
      activity.profile?.full_name ?? activity.profile?.username ?? "Someone";
    if (activity.content.includes("changed status to")) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: activity.content
              .replace(userName, `<b>${userName}</b>`)
              .replace(
                "changed status to",
                "changed the status of a ticket to"
              ),
          }}
        />
      );
    }
    if (activity.ticket_title) {
      return (
        <span>
          <b>{userName}</b> commented on ticket:{" "}
          <Link
            href={`/dashboard/tickets/${activity.ticket_id}`}
            className="font-bold hover:underline"
          >
            {activity.ticket_title}
          </Link>
        </span>
      );
    }
    return (
      <span>
        <b>{userName}</b> performed an action.
      </span>
    );
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All relevant tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.openTickets}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Tickets needing attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              My Open Tickets
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.myOpenTickets}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Tickets assigned to you
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Closed This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.closedTickets}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Recently resolved tickets
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>
                The latest 5 tickets from your help desk.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/tickets">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Created At
                  </TableHead>
                  <TableHead className="text-right">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-3/4" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : recentTickets.length > 0 ? (
                  recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/tickets/${ticket.id}`}
                          className="font-medium hover:underline"
                        >
                          {ticket.title}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          by{" "}
                          {ticket.created_by_profile?.full_name ??
                            ticket.created_by_profile?.username}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {ticket.category}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No recent tickets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              A feed of the latest ticket activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="grid gap-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={activity.profile?.avatar_url ?? undefined}
                    />
                    <AvatarFallback>
                      {getInitials(
                        activity.profile?.full_name,
                        activity.profile?.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-1 text-sm">
                    <p className="leading-snug text-muted-foreground">
                      {renderActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No recent activity.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
