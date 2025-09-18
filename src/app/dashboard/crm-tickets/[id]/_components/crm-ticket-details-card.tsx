
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsUpDown, Tag } from 'lucide-react';
import { updateCrmTicket, closeCrmTicket, type UiCrmTicketDetails, type CrmCategory } from '@/services/crm-service';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle } from 'lucide-react';

const statusColors: { [key: string]: string } = {
  open: 'bg-green-500/20 text-green-400 border-green-500/50',
  'pending support': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'pending client': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  closed: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const availableStatuses = ['open', 'pending support', 'pending client', 'closed'];

export default function CrmTicketDetailsCard({ initialTicket, categories }: { initialTicket: UiCrmTicketDetails, categories: CrmCategory[] }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  const handlePropertyChange = async (updateData: { status?: string; category?: string; }) => {
    if (updateData.status === ticket.status || updateData.category === ticket.category) return;
    
    setIsUpdating(true);
    try {
      const result = await updateCrmTicket(ticket.crm_id, updateData);
      if (result.success && result.updatedTicket) {
        setTicket(prev => prev ? { 
            ...prev, 
            status: result.updatedTicket.status,
            category: result.updatedTicket.category
        } : null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred while updating ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseTicket = async () => {
    setIsClosing(true);
    try {
        const result = await closeCrmTicket(ticket.crm_id);
        if (result.success && result.updatedTicket) {
            setTicket(prev => prev ? { 
                ...prev, 
                status: result.updatedTicket.status,
            } : null);
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    } catch (error) {
        console.error(error);
        toast.error("An unexpected error occurred while closing the ticket.");
    } finally {
        setIsClosing(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-1" disabled={isUpdating}>
                {isUpdating && ticket.status !== (ticket.status) ? <Loader2 className="h-4 w-4 animate-spin" /> :
                  <Badge variant="outline" className={`capitalize cursor-pointer ${statusColors[ticket.status] ?? ''}`}>
                    {ticket.status.replace(/_/g, ' ')}
                    <ChevronsUpDown className="ml-2 h-3 w-3" />
                  </Badge>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableStatuses.map(status => (
                <DropdownMenuItem 
                  key={status} 
                  onSelect={() => handlePropertyChange({ status })}
                  disabled={ticket.status === status}
                  className="capitalize"
                >
                  {status.replace(/_/g, ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Category</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-1" disabled={isUpdating}>
                {isUpdating && ticket.category !== (ticket.category) ? <Loader2 className="h-4 w-4 animate-spin" /> :
                  <Badge variant="outline" className="capitalize cursor-pointer">
                    {ticket.category}
                    <ChevronsUpDown className="ml-2 h-3 w-3" />
                  </Badge>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.map(cat => (
                <DropdownMenuItem 
                  key={cat.id} 
                  onSelect={() => handlePropertyChange({ category: cat.title })}
                  disabled={ticket.category === cat.title}
                  className="capitalize"
                >
                  {cat.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Client ID</span>
          <span className="font-medium">{ticket.client_id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium">{format(new Date(ticket.createdAt), "PP")}</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last Update</span>
            <span className="font-medium">{format(new Date(ticket.updatedAt), "PP")}</span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={ticket.status === 'closed' || isClosing}>
                {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : ticket.status === 'closed' ? <><CheckCircle className="mr-2 h-4 w-4" />Ticket Closed</> : <><XCircle className="mr-2 h-4 w-4" />Close Ticket</>}
              </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to close this ticket?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action will mark the ticket as closed and may not be reversible.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseTicket} className="bg-destructive hover:bg-destructive/90">
                  Confirm Close
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

    