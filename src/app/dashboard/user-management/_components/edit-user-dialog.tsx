'use client'

import React, { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import type { Database } from "@/lib/database.types"
import { updateUserProfile } from "../[id]/_actions/update-user-profile"
import { Loader2 } from "lucide-react"
import { handleProfileUpdate } from '../_actions/revalidate-users'

type Profile = Database['public']['Tables']['profiles']['Row']
type Department = Database['public']['Tables']['departments']['Row']
type UserRole = Database['public']['Enums']['user_role']

const formSchema = z.object({
  role: z.enum(["ceo", "system_admin", "super_admin", "admin", "department_head", "manager", "agent", "user"]),
  department_id: z.string().nullable(),
})

interface EditUserDialogProps {
  profile: Profile
  departments: Department[]
  children: React.ReactNode
}

const userRoles: UserRole[] = ["ceo", "system_admin", "super_admin", "admin", "department_head", "manager", "agent", "user"]

export default function EditUserDialog({ profile, departments, children }: EditUserDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: profile.role ?? 'user',
            department_id: profile.department_id,
        },
    })
    
    // Reset form when profile changes or dialog opens
    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                role: profile.role ?? 'user',
                department_id: profile.department_id,
            })
        }
    }, [profile, form, isOpen])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        
        const dataToSubmit = {
            ...values,
            department_id: values.department_id === 'no-department' ? null : values.department_id,
        };

        const result = await updateUserProfile(profile.id, dataToSubmit)

        if (result.success) {
            toast.success("User profile updated successfully!")
            await handleProfileUpdate();
            setIsOpen(false)
        } else {
            toast.error(result.message)
        }

        setIsSubmitting(false)
    }

    const formatRole = (role: string | undefined | null) => {
        if (!role) return 'N/A'
        return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {profile.full_name ?? profile.username}</DialogTitle>
                    <DialogDescription>
                        Update the user's role and assigned department.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {userRoles.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {formatRole(role)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="department_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value ?? 'no-department'}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Assign a department" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="no-department">No Department</SelectItem>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}