
'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  Laptop,
  LayoutTemplate,
  LineChart,
  Phone,
  Scale,
  Shield,
  Sparkles,
  DollarSign,
  Briefcase,
  Megaphone,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketForm } from '@/components/ticket-form'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { Department } from '@/lib/database.types'
import { useSearchParams } from 'next/navigation'

const iconMap: { [key: string]: React.ElementType } = {
  'IT Support': Shield,
  'Software/Application Issue': Laptop,
  'Trading Platform Issue': LineChart,
  'Client Complaint': Phone,
  'Withdrawal/Deposit Issue': DollarSign,
  'Regulatory Compliance Issue': Scale,
  'New Employee Onboarding': Briefcase,
  'Marketing Asset Request': Megaphone,
  'Office Equipment Issue': Wrench,
  'General Question/Request': HelpCircle,
  'General Request': HelpCircle,
  'Customer Support': Phone,
  'Finance Request': DollarSign,
  'Finance': DollarSign,
  'Compliance': Scale,
  'HR Request': Briefcase,
  'Security': Shield,
  'Risk Management': Scale,
  'default': HelpCircle,
}

const colorMap: { [key: string]: string } = {
  'IT Support': 'border-blue-500/50 hover:border-blue-500',
  'Software/Application Issue': 'border-purple-500/50 hover:border-purple-500',
  'Trading Platform Issue': 'border-orange-500/50 hover:border-orange-500',
  'Client Complaint': 'border-red-500/50 hover:border-red-500',
  'Withdrawal/Deposit Issue': 'border-green-500/50 hover:border-green-500',
  'Regulatory Compliance Issue': 'border-yellow-500/50 hover:border-yellow-500',
  'New Employee Onboarding': 'border-pink-500/50 hover:border-pink-500',
  'Marketing Asset Request': 'border-indigo-500/50 hover:border-indigo-500',
  'Office Equipment Issue': 'border-yellow-500/50 hover:border-yellow-500',
  'General Question/Request': 'border-gray-500/50 hover:border-gray-500',
  'General Request': 'border-gray-500/50 hover:border-gray-500',
  'Customer Support': 'border-red-500/50 hover:border-red-500',
  'Finance': 'border-green-500/50 hover:border-green-500',
  'Finance Request': 'border-green-500/50 hover:border-green-500',
  'Compliance': 'border-yellow-500/50 hover:border-yellow-500',
  'HR Request': 'border-pink-500/50 hover:border-pink-500',
  'Security': 'border-blue-500/50 hover:border-blue-500',
  'Risk Management': 'border-orange-500/50 hover:border-orange-500',
}

const iconBgMap: { [key: string]: string } = {
  'IT Support': 'bg-blue-500/10',
  'Software/Application Issue': 'bg-purple-500/10',
  'Trading Platform Issue': 'bg-orange-500/10',
  'Client Complaint': 'bg-red-500/10',
  'Withdrawal/Deposit Issue': 'bg-green-500/10',
  'Regulatory Compliance Issue': 'bg-yellow-500/10',
  'New Employee Onboarding': 'bg-pink-500/10',
  'Marketing Asset Request': 'bg-indigo-500/10',
  'Office Equipment Issue': 'bg-yellow-500/10',
  'General Question/Request': 'bg-gray-500/10',
  'General Request': 'bg-gray-500/10',
  'Customer Support': 'bg-red-500/10',
  'Finance': 'bg-green-500/10',
  'Finance Request': 'bg-green-500/10',
  'Compliance': 'bg-yellow-500/10',
  'HR Request': 'bg-pink-500/10',
  'Security': 'bg-blue-500/10',
  'Risk Management': 'bg-orange-500/10',
}

const iconColorMap: { [key: string]: string } = {
  'IT Support': 'text-blue-400',
  'Software/Application Issue': 'text-purple-400',
  'Trading Platform Issue': 'text-orange-400',
  'Client Complaint': 'text-red-400',
  'Withdrawal/Deposit Issue': 'text-green-400',
  'Regulatory Compliance Issue': 'text-yellow-400',
  'New Employee Onboarding': 'text-pink-400',
  'Marketing Asset Request': 'text-indigo-400',
  'Office Equipment Issue': 'text-yellow-400',
  'General Question/Request': 'text-gray-400',
  'General Request': 'text-gray-400',
  'Customer Support': 'text-red-400',
  'Finance': 'text-green-400',
  'Finance Request': 'text-green-400',
  'Compliance': 'text-yellow-400',
  'HR Request': 'text-pink-400',
  'Security': 'text-blue-400',
  'Risk Management': 'text-orange-400',
}

export type Template = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  default_title?: string;
  priority: string;
  category: string | null;
  department_id: string;
  departments: { name: string } | null;
  tags?: string[];
  is_default?: boolean;
}

const priorityClassMap: { [key: string]: string } = {
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
}


export default function CreateTicketPage() {
  const rawSearchParams = useSearchParams();
  const searchParams =  rawSearchParams ?? new URLSearchParams();
  
  const [view, setView] = useState<'templates' | 'form'>(searchParams.has('crm_ticket_id') ? 'form' : 'templates');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      
      const { data: customTemplatesData, error: templatesError } = await supabase
        .from('ticket_templates')
        .select('*, departments (name)')
        .order('title');

      if (templatesError) {
        toast.error('Failed to load ticket templates.');
        console.error(templatesError);
      }
      
      const customTemplates = (customTemplatesData as any[] || []).map(t => ({...t, is_default: false, description: t.category}));
      
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');
        
      if (departmentsError) {
        toast.error('Failed to load departments.');
        console.error(departmentsError);
      }

      const getDeptId = (name: string) => (departmentsData || []).find(d => d.name === name)?.id || (departmentsData || [])[0]?.id || '';
      
      const defaultTemplates: Template[] = [
        {
          id: 'default-pw-reset', title: 'Password Reset Request', subtitle: 'IT Support', priority: 'medium', category: 'IT Support',
          department_id: getDeptId('IT Support'), departments: { name: 'IT Support' }, is_default: true,
          tags: ['password', 'access', 'security'],
          description: 'Request a password reset for any of our internal systems.',
          default_title: 'Password Reset for [Your Name] on [System Name]',
        },
        {
          id: 'default-sw-issue', title: 'Software/Application Issue', subtitle: 'IT Support', priority: 'medium', category: 'Software/Application Issue',
          department_id: getDeptId('IT Support'), departments: { name: 'IT Support' }, is_default: true,
          tags: ['software', 'bug', 'application'],
          description: 'Report a bug or issue with a software application.',
          default_title: 'Bug Report: [Brief Description of Issue]',
        },
        {
          id: 'default-platform-issue', title: 'Trading Platform Issue', subtitle: 'IT Support', priority: 'high', category: 'Trading Platform Issue',
          department_id: getDeptId('IT Support'), departments: { name: 'IT Support' }, is_default: true,
          tags: ['trading', 'platform', 'mt4', '+2'],
          description: 'Report issues with the trading platform (e.g., MT4, MT5).',
          default_title: 'Trading Platform Issue: [Brief Description]',
        },
        {
          id: 'default-complaint', title: 'Client Complaint', subtitle: 'Customer Support', priority: 'high', category: 'Client Complaint',
          department_id: getDeptId('Customer Support'), departments: { name: 'Customer Support' }, is_default: true,
          tags: ['complaint', 'client-service', 'resolution', '+1'],
          description: 'Log a formal complaint from a client.',
          default_title: 'Client Complaint Regarding [Topic]',
        },
        {
          id: 'default-withdrawal', title: 'Withdrawal/Deposit Issue', subtitle: 'Finance Request', priority: 'high', category: 'Finance Request',
          department_id: getDeptId('Finance'), departments: { name: 'Finance' }, is_default: true,
          tags: ['withdrawal', 'deposit', 'payment', '+1'],
          description: 'Address issues related to client fund transfers.',
          default_title: 'Funding Issue: [Withdrawal/Deposit] for Client [Client ID]',
        },
        {
          id: 'default-regulatory', title: 'Regulatory Compliance Issue', subtitle: 'Compliance', priority: 'critical', category: 'Regulatory Compliance Issue',
          department_id: getDeptId('Compliance'), departments: { name: 'Compliance' }, is_default: true,
          tags: ['regulatory', 'compliance', 'audit', '+2'],
          description: 'Report a potential regulatory or compliance breach.',
          default_title: 'Compliance Alert: [Brief Description of Issue]',
        },
        {
          id: 'default-general', title: 'General Question/Request', subtitle: 'General Request', priority: 'low', category: 'General Question/Request',
          department_id: getDeptId('Customer Support'), departments: { name: 'General Request' }, is_default: true,
          tags: ['general', 'question', 'request'],
          description: 'For any other general questions or internal service requests.',
          default_title: 'General Request: [Your Question/Request]',
        },
      ];

      setTemplates([...defaultTemplates, ...customTemplates]);
      setLoading(false);
    };
    fetchTemplates();
  }, [supabase]);

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setView('form');
  }
  
  const handleCustomFormClick = () => {
    setSelectedTemplate(null);
    setView('form');
  }

  const handleBack = () => {
    setView('templates');
    setSelectedTemplate(null);
  }
  
  const getIcon = (category: string | null) => {
      if (!category) return iconMap.default;
      return iconMap[category] || iconMap.default;
  }

  const TemplateCard = ({ template }: { template: Template }) => {
    const Icon = getIcon(template.category);
    const category = template.category ?? 'General';
    return (
      <Card
        className={cn('bg-card/50 transition-all cursor-pointer relative flex flex-col hover:shadow-lg hover:scale-[1.02]', colorMap[category] || 'border-gray-500/50 hover:border-gray-500')}
        onClick={() => handleTemplateClick(template)}
      >
        <CardHeader>
          <div className="flex items-start gap-4 pr-8">
            <div className={cn('flex items-center justify-center h-12 w-12 rounded-lg', iconBgMap[category] || 'bg-gray-500/10')}>
              <Icon className={cn('h-6 w-6', iconColorMap[category] || 'text-gray-400')} />
            </div>
            <div className='flex-1'>
              <CardTitle className="text-base font-semibold">{template.title}</CardTitle>
              <CardDescription>{template.subtitle ?? template.departments?.name}</CardDescription>
            </div>
             {!template.is_default && (
                <Badge variant="secondary" className="absolute top-3 right-3 text-xs">Custom</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between gap-3">
            <p className="text-sm text-muted-foreground flex-grow">{template.description}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">{template.category}</Badge>
            <Badge variant="outline" className={cn('capitalize', priorityClassMap[template.priority])}>
              {template.priority}
            </Badge>
          </div>
        </CardContent>
         {template.tags && template.tags.length > 0 && (
            <CardFooter className="flex flex-wrap gap-x-2 gap-y-1">
                {template.tags.map(tag => (
                    <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                ))}
            </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center gap-4">
        {view === 'form' ? (
             <Button variant="outline" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
        ) : (
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
        )}
        <div>
            <h1 className="font-headline text-3xl font-bold">Create New Ticket</h1>
            <p className="text-muted-foreground">Submit a new support request or choose from our quick-start templates</p>
        </div>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
        <div className="flex flex-col gap-4">
            <Card className="bg-muted/30">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg font-semibold">Get Started</CardTitle>
                    </div>
                    <CardDescription>Choose how you'd like to create your ticket</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <button 
                        className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-muted-foreground transition-all",
                            view === 'templates' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted/50'
                        )}
                        onClick={() => setView('templates')}
                    >
                        <LayoutTemplate className="h-5 w-5" />
                        <div>
                            <p className="font-semibold">Quick Templates</p>
                            <p className={cn("text-xs", view === 'templates' ? 'text-primary/80' : 'text-muted-foreground')}>
                                Pre-filled forms for common issues
                            </p>
                        </div>
                    </button>
                     <button 
                        className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-muted-foreground transition-all",
                            view === 'form' && !selectedTemplate ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted/50'
                        )}
                        onClick={handleCustomFormClick}
                     >
                        <FileText className="h-5 w-5" />
                         <div>
                            <p className="font-semibold">Custom Form</p>
                            <p className={cn("text-xs", view === 'form' && !selectedTemplate ? 'text-primary/80' : 'text-muted-foreground')}>
                                Create from scratch
                            </p>
                        </div>
                    </button>
                </CardContent>
            </Card>
        </div>

        {view === 'templates' && (
            <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Quick Start Templates</h2>
                </div>
                <p className="text-muted-foreground">
                    Choose a template to get started quickly with pre-filled information for common ticket types
                </p>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                    ))}
                    {templates.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No templates have been configured.</p>}
                </div>
                )}
            </div>
        )}

        {view === 'form' && (
            <div className="flex flex-col gap-4">
                <TicketForm template={selectedTemplate} crmTicketId={searchParams.get('crm_ticket_id')} />
            </div>
        )}
      </div>
    </main>
  )
}
