
'use client'

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CornerUpRight } from 'lucide-react';
import { TicketForm } from '@/components/ticket-form';
import type { UiCrmTicketDetails } from '@/services/crm-service';
import type { Template } from '@/app/dashboard/create-ticket/page';
import { stripHtml } from 'string-strip-html';

interface EscalateTicketModalProps {
    ticket: UiCrmTicketDetails;
}

export default function EscalateTicketModal({ ticket }: EscalateTicketModalProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Create a template object on the fly to pass to the TicketForm
    const escalationTemplate: Template = {
        id: `escalate-${ticket.crm_id}`,
        title: `Escalate: ${ticket.title}`,
        description: stripHtml(ticket.comments[0]?.text ?? 'No initial description.').result,
        default_title: `CRM-${ticket.crm_id}: ${ticket.title}`,
        category: ticket.category,
        priority: 'medium', // Default priority for escalations
        department_id: '', // User will select this
        departments: null,
        is_default: true, // Treat as a default for form pre-filling logic
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <CornerUpRight className="mr-2 h-4 w-4" /> Escalate
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Escalate CRM Ticket</DialogTitle>
                    <DialogDescription>
                        Create a new internal ticket based on this CRM conversation.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto">
                    <TicketForm
                        template={escalationTemplate}
                        crmTicketId={ticket.crm_id}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

