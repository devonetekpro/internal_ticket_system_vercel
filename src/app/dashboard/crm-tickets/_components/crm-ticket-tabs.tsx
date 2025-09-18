"use client";

import React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MessageSquare,
  ArrowUpRight,
  Clock,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type UiCrmTicket,
  type CrmTicketView,
  type PaginatedCrmTickets,
} from "@/services/crm-service";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import PaginationControls from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CrmTicketFilters from "./crm-ticket-filters";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;
const REFRESH_INTERVAL = 30000; // 30 seconds

const statusColors: { [key: string]: string } = {
  open: "bg-green-500/20 text-green-400 border-green-500/50",
  "pending support": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  "pending client": "bg-orange-500/20 text-orange-400 border-orange-500/50",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  resolved: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  closed: "bg-red-500/20 text-red-400 border-red-500/50",
};

const CrmTicketTableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>ID</TableHead>
        <TableHead>Title</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Manager Assigned</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Client</TableHead>
        <TableHead>Created</TableHead>
        <TableHead>Updated</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(10)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-28 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-8 w-8 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const TicketTable = ({
  tickets,
  managers,
  isLoading,
}: {
  tickets: UiCrmTicket[];
  managers: Map<string, string>;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <CrmTicketTableSkeleton />;
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No tickets found for the current filters.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Manager Assigned</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-mono text-xs">{ticket.crm_id}</TableCell>
            <TableCell className="font-medium">{ticket.title}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`capitalize ${statusColors[ticket.status] ?? ""}`}
              >
                {ticket.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              {ticket.managerId
                ? managers.get(ticket.managerId.toString()) ??
                  `ID: ${ticket.managerId}`
                : "Unassigned"}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {ticket.category}
              </Badge>
            </TableCell>
            <TableCell>{ticket.client_id}</TableCell>
            <TableCell>{format(new Date(ticket.createdAt), "PP")}</TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(ticket.updatedAt), {
                addSuffix: true,
              })}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/dashboard/crm-tickets/${ticket.crm_id}`}>
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default function CrmTicketTabs({
  initialData,
  managers,
}: {
  initialData: PaginatedCrmTickets | null;
  managers: Map<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const view = (searchParams.get("view") as CrmTicketView) || "opened";
  const isFiltering =
    !!searchParams.get("search") || !!searchParams.get("status");

  React.useEffect(() => {
    const interval = setInterval(() => {
      router.replace(`${pathname}?${searchParams.toString()}`);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [router, pathname, searchParams]);

  const handleTabChange = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    params.set("page", "1"); // Reset to first page on view change
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabInfo: {
    value: CrmTicketView;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "opened", label: "Opened", icon: MessageSquare },
    { value: "opened_today", label: "Opened Today", icon: Clock },
    {
      value: "waiting_for_response",
      label: "Waiting For Response",
      icon: MessageSquare,
    },
    { value: "closed", label: "Closed", icon: CheckCircle },
    { value: "all", label: "All Tickets", icon: MessageSquare },
  ];

  const isLoading = !initialData;

  return (
    <>
      <div className="flex items-center gap-2">
        <CrmTicketFilters />
      </div>

      <Tabs
        value={isFiltering ? "search_results" : view}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <div className="overflow-x-auto">
        <TabsList className="flex w-max ">
    {tabInfo.map((tab) => (
        <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="gap-2"
            disabled={isFiltering}
        >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <Badge variant="secondary" className="ml-2">
                {isLoading
                    ? "..."
                    : initialData.counts[
                          tab.value as keyof typeof initialData.counts
                      ]}
            </Badge>
        </TabsTrigger>
    ))}
</TabsList>
</div>
        <Card>
          <CardHeader>
            <CardTitle>
              {isFiltering
                ? "Filtered Results"
                : `${tabInfo.find((t) => t.value === view)?.label} Tickets`}
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading tickets..."
                : `Found ${initialData.totalCount} ticket${
                    initialData.totalCount !== 1 ? "s" : ""
                  }.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <TicketTable
              tickets={initialData?.tickets ?? []}
              managers={managers}
              isLoading={isLoading}
            />
          </CardContent>
          <CardFooter>
            <PaginationControls
              totalCount={initialData?.totalCount ?? 0}
              pageSize={PAGE_SIZE}
              currentPage={page}
            />
          </CardFooter>
        </Card>
      </Tabs>
    </>
  );
}
