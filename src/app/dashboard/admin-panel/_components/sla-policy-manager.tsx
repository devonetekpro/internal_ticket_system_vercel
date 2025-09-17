
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Trash2, Edit, Timer, ShieldAlert, BadgeInfo } from 'lucide-react';
import type { Department } from '@/lib/database.types';
import { createSlaPolicy, updateSlaPolicy, deleteSlaPolicy } from '../_actions/sla-policy-actions';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type SlaPolicyWithDept = {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  department_id: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  is_active: boolean;
  departments: { name: string } | null;
};

interface SlaPolicyManagerProps {
  initialPolicies: SlaPolicyWithDept[];
  departments: Department[];
}

const priorities = ["low", "medium", "high", "critical"];

const formSchema = z.object({
  name: z.string().min(3, 'Policy name is required.'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  department_id: z.string().nullable(),
  response_time_minutes: z.coerce.number().int().min(1),
  resolution_time_minutes: z.coerce.number().int().min(1),
  is_active: z.boolean(),
});

const SlaPolicyForm = ({
  departments,
  policy,
  onFormSubmit,
  isSubmitting,
  onClose,
}: {
  departments: Department[];
  policy?: SlaPolicyWithDept | null;
  onFormSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  onClose: () => void;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: policy?.name ?? '',
      description: policy?.description ?? '',
      priority: (policy?.priority as any) ?? 'medium',
      department_id: policy?.department_id ?? null,
      response_time_minutes: policy?.response_time_minutes ?? 60,
      resolution_time_minutes: policy?.resolution_time_minutes ?? 240,
      is_active: policy?.is_active ?? true,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    await onFormSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Policy Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Critical Finance Tickets" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="A brief description of when this policy applies." /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem><FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a priority" /></SelectTrigger></FormControl>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={form.control} name="department_id" render={({ field }) => (
            <FormItem><FormLabel>Department (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? 'null'}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="null">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )} />
        </div>
         <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="response_time_minutes" render={({ field }) => (
            <FormItem><FormLabel>Response Time (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="resolution_time_minutes" render={({ field }) => (
            <FormItem><FormLabel>Resolution Time (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <FormField control={form.control} name="is_active" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormMessage />
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : policy ? 'Save Changes' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function SlaPolicyManager({ initialPolicies, departments }: SlaPolicyManagerProps) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyWithDept | null>(null);

  const handleFormAction = async (data: FormData) => {
    setIsSubmitting(true);
    const action = editingPolicy ? updateSlaPolicy(editingPolicy.id, data) : createSlaPolicy(data);
    const result = await action;
    
    if (result.success) {
      toast.success(result.message);
      // Re-fetch or optimistically update state
      // For simplicity, we can just close the dialog and rely on revalidation
      closeDialog();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteSlaPolicy(id);
    if (result.success) {
      toast.success(result.message);
      setPolicies(policies.filter(p => p.id !== id));
    } else {
      toast.error(result.message);
    }
  };

  const openDialog = (policy: SlaPolicyWithDept | null = null) => {
    setEditingPolicy(policy);
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPolicy(null);
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> SLA Policy Management</CardTitle>
        <CardDescription>Define Service Level Agreement rules for ticket response and resolution times.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map(policy => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">
                    <p>{policy.name}</p>
                    <p className="text-xs text-muted-foreground">{policy.description}</p>
                </TableCell>
                <TableCell className="capitalize">{policy.priority}</TableCell>
                <TableCell>{policy.departments?.name ?? <Badge variant="secondary">All Departments</Badge>}</TableCell>
                <TableCell>{formatMinutes(policy.response_time_minutes)}</TableCell>
                <TableCell>{formatMinutes(policy.resolution_time_minutes)}</TableCell>
                <TableCell><Badge variant={policy.is_active ? "default" : "secondary"}>{policy.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(policy)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(policy.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {policies.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center">No SLA policies found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add SLA Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit' : 'Create'} SLA Policy</DialogTitle>
              <DialogDescription>Define the time limits for tickets matching these criteria.</DialogDescription>
            </DialogHeader>
            <SlaPolicyForm
              departments={departments}
              policy={editingPolicy}
              onFormSubmit={handleFormAction}
              isSubmitting={isSubmitting}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
