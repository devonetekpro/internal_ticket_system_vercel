
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CommentTemplate } from '@/lib/database.types';
import { getCommentTemplates, createCommentTemplate, updateCommentTemplate, deleteCommentTemplate } from '@/app/dashboard/account/_actions/comment-template-actions';
import { TemplateDialogForm } from '@/app/dashboard/account/_components/comment-template-manager';
import type { z } from 'zod';
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

interface TemplateSelectionModalProps {
    onTemplateSelect: (content: string) => void;
    onDialogClose?: () => void;
}

export const TemplateSelectionModal = ({ onTemplateSelect, onDialogClose }: TemplateSelectionModalProps) => {
    const [templates, setTemplates] = useState<CommentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOrEditDialogOpen, setIsCreateOrEditDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CommentTemplate | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            const fetchedTemplates = await getCommentTemplates();
            setTemplates(fetchedTemplates);
            setIsLoading(false);
        }
        fetchTemplates();
    }, []);

    const handleFormSubmit = async (values: z.infer<any>) => {
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
            closeCreateOrEditDialog();
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
    
    const handleSelect = (template: CommentTemplate) => {
        onTemplateSelect(template.content);
        if (onDialogClose) {
            onDialogClose();
        }
    }

    const openCreateOrEditDialog = (template: CommentTemplate | null = null) => {
        setEditingTemplate(template);
        setIsCreateOrEditDialogOpen(true);
    };
    
    const closeCreateOrEditDialog = () => {
        setEditingTemplate(null);
        setIsCreateOrEditDialogOpen(false);
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Select a Comment Template</DialogTitle>
                <DialogDescription>Click a template to insert it, or manage your templates here.</DialogDescription>
            </DialogHeader>
            <div className="border-t pt-4">
                <div className="flex justify-end mb-4">
                    <Dialog open={isCreateOrEditDialogOpen} onOpenChange={setIsCreateOrEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => openCreateOrEditDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create New Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Comment Template</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 max-h-[70vh] overflow-y-auto">
                                <TemplateDialogForm
                                    onSubmit={handleFormSubmit}
                                    isSubmitting={isSubmitting}
                                    defaultValues={editingTemplate ?? undefined}
                                    onClose={closeCreateOrEditDialog}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <ScrollArea className="h-96">
                    <div className="p-1 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : templates.length > 0 ? (
                            templates.map(template => (
                                <div key={template.id} className="p-3 rounded-md border group hover:bg-muted transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 cursor-pointer" onClick={() => handleSelect(template)}>
                                            <p className="font-semibold">{template.title}</p>
                                            <div className="text-sm text-muted-foreground line-clamp-2 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: template.content }}></div>
                                        </div>
                                        <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => openCreateOrEditDialog(template)}>
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
                                                        <AlertDialogDescription>This will permanently delete this template.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-muted-foreground text-center py-8">
                                <p>No comment templates found.</p>
                                <p className="text-xs">Click "Create New Template" above to add one.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </DialogContent>
    );
};
