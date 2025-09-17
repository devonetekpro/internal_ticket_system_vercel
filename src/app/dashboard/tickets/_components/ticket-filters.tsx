

'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ListFilter, Search, RotateCcw, File, Loader2 } from 'lucide-react'
import * as React from 'react'
import { useDebounce } from 'use-debounce'
import type { UserProfile } from '../page'
import { exportTickets } from '../_actions/export-tickets'
import { toast } from 'sonner'

const statuses = ['open', 'in_progress', 'resolved', 'closed'];
const priorities = ['low', 'medium', 'high', 'critical'];

const statusColors: { [key: string]: string } = {
  open: 'bg-green-500',
  in_progress: 'bg-yellow-500',
  closed: 'bg-red-500',
  resolved: 'bg-blue-500',
};

const priorityColors: { [key: string]: string } = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
}


export default function TicketFilters({ 
    currentUserProfile,
    onRefresh,
    isRefreshing,
}: { 
    currentUserProfile: UserProfile | null,
    onRefresh: () => void,
    isRefreshing: boolean,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isExporting, setIsExporting] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('search') || '')
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)

  const createQueryString = React.useCallback(
    (paramsToUpdate: { name: string, value: string }[]) => {
      const params = new URLSearchParams(searchParams.toString())
      paramsToUpdate.forEach(({name, value}) => {
          if (value) {
            params.set(name, value)
          } else {
            params.delete(name)
          }
      });
      // Always reset to page 1 when filters change
      params.set('page', '1');
      return params.toString()
    },
    [searchParams]
  )

  React.useEffect(() => {
    const newQuery = createQueryString([{ name: 'search', value: debouncedSearchQuery }])
    router.push(`${pathname}?${newQuery}`)
  }, [debouncedSearchQuery, router, pathname, createQueryString])
  
  const handleFilterChange = (filterName: string, value: string) => {
    const currentValue = searchParams.get(filterName);
    const newValue = currentValue === value ? '' : value; // Toggle off if same value is clicked
    const newQuery = createQueryString([{ name: filterName, value: newValue }])
    router.push(`${pathname}?${newQuery}`)
  }
  
  const resetFilters = () => {
    setSearchQuery('')
    const currentTab = searchParams.get('tab')
    router.push(`${pathname}${currentTab ? `?tab=${currentTab}`: ''}`)
  }
  
  const canExport = currentUserProfile && ['system_admin', 'admin', 'ceo'].includes(currentUserProfile.role ?? '');

  const handleExport = async () => {
    setIsExporting(true);
    try {
        const filters = {
            tab: searchParams.get('tab') || 'my_tickets',
            search: searchParams.get('search'),
            status: searchParams.get('status'),
            priority: searchParams.get('priority'),
        };

        const result = await exportTickets(filters);

        if (result.success && result.csvData) {
            const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `tickets-export-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Tickets exported successfully!');
        } else {
            toast.error(result.message || 'Failed to export tickets.');
        }
    } catch (error) {
        console.error(error);
        toast.error('An unexpected error occurred during export.');
    } finally {
        setIsExporting(false);
    }
  };


  return (
    <div className="flex w-full items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-10">
            <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
        </Button>
        <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search tickets..."
                className="w-full rounded-lg bg-background pl-8 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        
        <DropdownMenu>
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
                {statuses.map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={searchParams.get('status') === status}
                    onSelect={(e) => {
                        e.preventDefault()
                        handleFilterChange('status', status)
                    }}
                    className="capitalize"
                  >
                    <span className={`mr-2 h-2 w-2 rounded-full ${statusColors[status]}`}></span>
                    {status.replace(/_/g, ' ')}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Priority
                </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {priorities.map(priority => (
                  <DropdownMenuCheckboxItem
                    key={priority}
                    checked={searchParams.get('priority') === priority}
                    onSelect={(e) => {
                        e.preventDefault()
                        handleFilterChange('priority', priority)
                    }}
                    className="capitalize"
                  >
                    <span className={`mr-2 h-2 w-2 rounded-full ${priorityColors[priority]}`}></span>
                    {priority}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={resetFilters} variant="ghost" size="sm" className="h-10">
            <RotateCcw className="mr-2 h-4 w-4"/>
            Reset
        </Button>
        
        {canExport && (
            <Button size="sm" variant="outline" className="h-10 gap-1" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <File className="h-3.5 w-3.5" />
              )}
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
        )}
    </div>
  )
}
