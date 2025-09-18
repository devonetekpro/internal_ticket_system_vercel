
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PaginationControlsProps {
  totalCount: number
  pageSize: number
  currentPage: number
  pageSizeOptions?: number[]
}

export default function PaginationControls({ totalCount, pageSize, currentPage, pageSizeOptions = [10, 25, 50, 100] }: PaginationControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const rawSearchParams = useSearchParams();
    const searchParams = rawSearchParams ?? new URLSearchParams();
  
  const totalPages = Math.ceil(totalCount / pageSize)
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', newPageSize);
    params.set('page', '1'); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalCount === 0) {
    return null;
  }
  
  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalCount);


  return (
    <div className="flex flex-wrap items-center justify-between w-full text-sm text-muted-foreground gap-4">
    <div className="flex-1">
        {/* Placeholder for selected rows count if needed in the future */}
    </div>
    <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent side="top">
                    {pageSizeOptions.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                            {size}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className='flex flex-row gap-4 items-center'>
          <div className="font-medium">
            Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
            >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
            >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
            >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
            >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
        </div>
        
    </div>
</div>
  )
}
