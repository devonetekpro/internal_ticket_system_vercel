
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X } from 'lucide-react';
import type { Department } from '@/lib/database.types';
import { createDepartment, updateDepartment, deleteDepartment } from '../_actions/department-actions';
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
import { Separator } from '@/components/ui/separator';

interface DepartmentManagerProps {
  departments: Department[];
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Department name must be at least 2 characters.' }),
});

export default function DepartmentManager({ departments: initialDepartments }: DepartmentManagerProps) {
  const [departments, setDepartments] = React.useState(initialDepartments);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingDeptId, setEditingDeptId] = React.useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = React.useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const result = await createDepartment(values.name);
    if (result.success && result.data) {
      toast.success(result.message);
      setDepartments([...departments, ...result.data]);
      form.reset();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };
  
  const handleEditClick = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };
  
  const handleCancelEdit = () => {
    setEditingDeptId(null);
    setEditingDeptName('');
  };
  
  const handleUpdate = async () => {
    if (!editingDeptId || !editingDeptName) return;
    setIsSubmitting(true);
    const result = await updateDepartment(editingDeptId, editingDeptName);
    if (result.success && result.data) {
        toast.success(result.message);
        setDepartments(departments.map(d => d.id === editingDeptId ? result.data! : d));
        handleCancelEdit();
    } else {
        toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteDepartment(id);
    if (result.success) {
        toast.success(result.message);
        setDepartments(departments.filter(d => d.id !== id));
    } else {
        toast.error(result.message);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Management</CardTitle>
        <CardDescription>Create, view, and manage departments for ticket routing and user assignment.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                {editingDeptId === dept.id ? (
                    <Input 
                        value={editingDeptName} 
                        onChange={(e) => setEditingDeptName(e.target.value)}
                        className="h-9 flex-grow mr-2"
                    />
                  ) : (
                    <span className="font-medium">{dept.name}</span>
                )}
                <div className="flex items-center">
                    {editingDeptId === dept.id ? (
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
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(dept)}>
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
                                    This action cannot be undone. This will permanently delete the 
                                    <span className="font-bold"> {dept.name} </span> 
                                    department. Make sure no users are assigned to this department before deleting.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(dept.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
             {departments.length === 0 && (
                <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                    No departments found. Create one below.
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
              name="name"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel>New Department Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Finance, Technical Support" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              Add Department
            </Button>
          </form>
        </Form>
      </CardFooter>
    </Card>
  );
}
