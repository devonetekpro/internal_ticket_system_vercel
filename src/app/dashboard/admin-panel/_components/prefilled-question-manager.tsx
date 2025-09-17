
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, MessageSquarePlus } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { createPrefilledQuestion, updatePrefilledQuestion, deletePrefilledQuestion } from '../_actions/prefilled-question-actions';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';

type PrefilledQuestion = Database['public']['Tables']['prefilled_questions']['Row'];

interface PrefilledQuestionManagerProps {
  initialQuestions: PrefilledQuestion[];
}

const formSchema = z.object({
  question: z.string().min(5, { message: 'Question must be at least 5 characters.' }).max(200, { message: 'Question must be less than 200 characters.' }),
});

export default function PrefilledQuestionManager({ initialQuestions }: PrefilledQuestionManagerProps) {
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = React.useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { question: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const result = await createPrefilledQuestion(values.question);
    if (result.success && result.data) {
      toast.success(result.message);
      setQuestions(prev => [...prev, result.data!]);
      form.reset();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };
  
  const handleEditClick = (q: PrefilledQuestion) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.question);
  };
  
  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingQuestionText('');
  };
  
  const handleUpdate = async () => {
    if (!editingQuestionId || !editingQuestionText) return;
    setIsSubmitting(true);
    const result = await updatePrefilledQuestion(editingQuestionId, editingQuestionText);
    if (result.success) {
        toast.success(result.message);
        setQuestions(questions.map(q => q.id === editingQuestionId ? { ...q, question: editingQuestionText } : q));
        handleCancelEdit();
    } else {
        toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deletePrefilledQuestion(id);
    if (result.success) {
        toast.success(result.message);
        setQuestions(questions.filter(q => q.id !== id));
    } else {
        toast.error(result.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquarePlus /> Chat Widget: Prefilled Questions</CardTitle>
        <CardDescription>Manage the suggested questions that appear when a user opens the AI chat widget.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            {questions.map(q => (
              <div key={q.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                {editingQuestionId === q.id ? (
                    <Input 
                        value={editingQuestionText} 
                        onChange={(e) => setEditingQuestionText(e.target.value)}
                        className="h-9 flex-grow mr-2"
                    />
                  ) : (
                    <span className="font-medium text-sm">"{q.question}"</span>
                )}
                <div className="flex items-center">
                    {editingQuestionId === q.id ? (
                     <>
                        <Button variant="ghost" size="icon" onClick={handleUpdate} disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                           <X className="h-4 w-4" />
                        </Button>
                    </>
                  ) : (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
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
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the question. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(q.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
             {questions.length === 0 && (
                <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                    No prefilled questions found. Add one below.
                </div>
            )}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4 w-full">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel>New Question</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., How do I reset my password?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Question
            </Button>
          </form>
        </Form>
      </CardFooter>
    </Card>
  );
}
