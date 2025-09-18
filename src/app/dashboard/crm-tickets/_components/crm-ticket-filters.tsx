"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ListFilter, Search, RotateCcw } from "lucide-react";
import * as React from "react";
import { useDebounce } from "use-debounce";

const statuses = ["open", "pending support", "pending client", "closed"];

export default function CrmTicketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const [searchQuery, setSearchQuery] = React.useState(
    searchParams.get("search") || ""
  );
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const selectedStatuses = React.useMemo(() => {
    const statusParam = searchParams.get("status");
    return statusParam ? statusParam.split(",") : [];
  }, [searchParams]);

  const createQueryString = React.useCallback(
    (paramsToUpdate: { name: string; value: string }[]) => {
      const params = new URLSearchParams(searchParams.toString());
      paramsToUpdate.forEach(({ name, value }) => {
        if (value) {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      });
      // Always reset to page 1 when filters change
      params.set("page", "1");
      return params.toString();
    },
    [searchParams]
  );

  React.useEffect(() => {
    const newQuery = createQueryString([
      { name: "search", value: debouncedSearchQuery },
    ]);
    router.push(`${pathname}?${newQuery}`);
  }, [debouncedSearchQuery, router, pathname, createQueryString]);

  const handleStatusChange = (status: string) => {
    const newSelectedStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    const newQuery = createQueryString([
      { name: "status", value: newSelectedStatuses.join(",") },
    ]);
    router.push(`${pathname}?${newQuery}`);
  };

  const resetFilters = () => {
    setSearchQuery("");
    router.push(pathname);
  };

  return (
    <div className="flex w-full items-center gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title, ticket ID, or client ID..."
          className="w-full rounded-lg bg-background pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 gap-1">
            <ListFilter className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Status
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statuses.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onSelect={(e) => {
                e.preventDefault();
                handleStatusChange(status);
              }}
              className="capitalize"
            >
              {status.replace(/_/g, " ")}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu> */}

      <Button onClick={resetFilters} variant="ghost">
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
