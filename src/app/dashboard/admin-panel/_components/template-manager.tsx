
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
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { Department } from '@/lib/database.types';
import { createTemplate, updateTemplate, deleteTemplate } from '../_actions/template-actions';
import { toast } from 'sonner';

type TemplateWithDept = {
  id: string;
  title: string;
  department_id: string;
  priority: string;
  category: string | null;
  departments: { name: string } | null;
};

interface TemplateManagerProps {
  initialTemplates: TemplateWithDept[];
  departments: Department[];
}

const categories = ["General Request", "IT Support", "Customer Support", "Finance", "HR Request", "Security", "Risk Management"];
const priorities = ["low", "medium", "high", "critical"];

const formSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  department_id: z.string().min(1, 'Department is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1, 'Category is required'),
});

const TemplateForm = ({
  departments,
  template,
  onFormSubmit,
  isSubmitting,
  onClose,
}: {
  departments: Department[];
  template?: TemplateWithDept | null;
  onFormSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  onClose: () => void;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: template?.title ?? '',
      department_id: template?.department_id ?? '',
      priority: (template?.priority as any) ?? 'medium',
      category: template?.category ?? '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value);
    });
    await onFormSubmit(formData);
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Template Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem><FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="department_id" render={({ field }) => (
          <FormItem><FormLabel>Department</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
              <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem><FormLabel>Priority</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a priority" /></SelectTrigger></FormControl>
              <SelectContent>{priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function TemplateManager({ initialTemplates, departments }: TemplateManagerProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithDept | null>(null);

  const handleCreate = async (data: FormData) => {
    setIsSubmitting(true);
    const result = await createTemplate(data);
    if (result.success) {
      toast.success(result.message);
      // Optimistically add or re-fetch
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async (data: FormData) => {
    if (!editingTemplate) return;
    setIsSubmitting(true);
    const result = await updateTemplate(editingTemplate.id, data);
     if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteTemplate(id);
    if (result.success) {
      toast.success(result.message);
      setTemplates(templates.filter(t => t.id !== id));
    } else {
      toast.error(result.message);
    }
  };

  const openDialog = (template: TemplateWithDept | null = null) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Template Management</CardTitle>
        <CardDescription>Create and manage templates for faster ticket creation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>{template.departments?.name}</TableCell>
                <TableCell>{template.category}</TableCell>
                <TableCell className="capitalize">{template.priority}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(template)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">No templates found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
              <DialogDescription>Fill out the details for the ticket template.</DialogDescription>
            </DialogHeader>
            <TemplateForm
              departments={departments}
              template={editingTemplate}
              onFormSubmit={editingTemplate ? handleUpdate : handleCreate}
              isSubmitting={isSubmitting}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
