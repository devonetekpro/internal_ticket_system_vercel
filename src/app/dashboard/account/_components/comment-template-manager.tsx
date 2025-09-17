
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Save, FileText } from 'lucide-react';
import type { CommentTemplate } from '@/lib/database.types';
import { createCommentTemplate, updateCommentTemplate, deleteCommentTemplate } from '../_actions/comment-template-actions';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import TextEditor from '@/components/text-editor';


interface CommentTemplateManagerProps {
  initialTemplates: CommentTemplate[];
}

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  content: z.string().min(10, { message: 'Template content must be at least 10 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

export const TemplateDialogForm = ({
  onSubmit,
  isSubmitting,
  defaultValues,
  onClose,
}: {
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<FormValues>;
  onClose: () => void;
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || { title: '', content: '' },
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Password Reset Instructions" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
              <FormControl>
                <TextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter the template content..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Template
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default function CommentTemplateManager({ initialTemplates }: CommentTemplateManagerProps) {
  const [templates, setTemplates] = React.useState(initialTemplates);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<CommentTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const openDialog = (template: CommentTemplate | null = null) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setEditingTemplate(null);
    setIsDialogOpen(false);
  }
  
  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const result = editingTemplate 
      ? await updateCommentTemplate(editingTemplate.id, values)
      : await createCommentTemplate(values);
      
    if (result.success && result.data) {
        toast.success(result.message);
        if (editingTemplate) {
            setTemplates(templates.map(t => t.id === result.data!.id ? result.data! : t));
        } else {
            setTemplates([result.data!, ...templates]);
        }
        closeDialog();
    } else {
        toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCommentTemplate(id);
    if (result.success) {
        toast.success(result.message);
        setTemplates(templates.filter(t => t.id !== id));
    } else {
        toast.error(result.message);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> My Comment Templates</CardTitle>
        <CardDescription>Create and manage reusable comment templates to speed up your workflow.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            {templates.map(template => (
              <div key={template.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="font-medium">{template.title}</span>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(template)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the template.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            ))}
             {templates.length === 0 && (
                <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                    You haven't created any templates yet.
                </div>
            )}
        </div>
      </CardContent>
      <CardFooter>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Template
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Comment Template</DialogTitle>
                    <DialogDescription>
                        Fill out the details for your reusable template.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto">
                    <TemplateDialogForm
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                        defaultValues={editingTemplate ?? undefined}
                        onClose={closeDialog}
                    />
                </div>
            </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
