'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import EscalateTicketModal from './escalate-ticket-modal';
import type { UiCrmTicketDetails } from '@/services/crm-service';

interface CrmTicketHeaderActionsProps {
  ticket: UiCrmTicketDetails;
}

export default function CrmTicketHeaderActions({ ticket }: CrmTicketHeaderActionsProps) {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Ticket URL copied to clipboard!');
  };

  return (
    <div className=" flex items-center gap-2">
      <Button variant="outline" onClick={handleShare}>
        <Share2 className="mr-2 h-4 w-4" /> Share
      </Button>
      <EscalateTicketModal ticket={ticket} />
    </div>
  );
}
