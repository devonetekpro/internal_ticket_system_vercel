

'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RolePermissions } from '@/lib/database.types';
import type { permissionGroups } from '../page';
import { updateRolePermissions } from '../_actions/update-role-permissions';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type UserRole = RolePermissions['role'];

const permissionSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
});

const roleSchema = z.object({
  role: z.string(),
  permissions: z.array(permissionSchema),
});

const formSchema = z.object({
  roles: z.array(roleSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface PermissionsTableProps {
  initialPermissions: RolePermissions[];
  permissionGroups: typeof permissionGroups;
  manageableRoles: UserRole[];
}

export default function PermissionsTable({
  initialPermissions,
  permissionGroups,
  manageableRoles,
}: PermissionsTableProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const allPermissionKeys = React.useMemo(() => {
    return Object.values(permissionGroups).flatMap(group => Object.keys(group.permissions));
  }, [permissionGroups]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roles: manageableRoles.map(role => {
        const rolePerms = initialPermissions.find(p => p.role === role);
        const currentPermissions = rolePerms?.permissions as Record<string, boolean> ?? {};
        
        return {
          role,
          permissions: allPermissionKeys.map(key => ({
            key,
            enabled: currentPermissions[key] ?? false,
          })),
        };
      }),
    },
  });

  const { fields, control } = useFieldArray({
    control: form.control,
    name: 'roles',
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    const transformedData: RolePermissions[] = data.roles.map(roleData => {
        const permissionsObject = roleData.permissions.reduce((acc, perm) => {
            acc[perm.key] = perm.enabled;
            return acc;
        }, {} as Record<string, boolean>);

        return {
            role: roleData.role as UserRole,
            permissions: permissionsObject
        };
    });

    try {
        const result = await updateRolePermissions(transformedData);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    } catch (error) {
        toast.error('An unexpected error occurred.');
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formatRoleName = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Permission</TableHead>
                {fields.map((field) => (
                  <TableHead key={field.id} className="text-center">{formatRoleName(field.role)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(permissionGroups).map(([groupKey, group]) => (
                <React.Fragment key={groupKey}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={fields.length + 1} className="font-semibold text-base">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {group.title}
                      </div>
                    </TableCell>
                  </TableRow>
                  {Object.entries(group.permissions).map(([permKey, permDetails]) => {
                     const permIndexInForm = allPermissionKeys.indexOf(permKey);
                     return (
                        <TableRow key={permKey}>
                            <TableCell>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <p className="font-medium cursor-help">{permDetails.label}</p>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">{permDetails.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            {fields.map((field, roleIndex) => (
                                <TableCell key={`${field.id}-${permKey}`} className="text-center">
                                     <Controller
                                        name={`roles.${roleIndex}.permissions.${permIndexInForm}.enabled`}
                                        control={control}
                                        render={({ field: checkboxField }) => (
                                            <Checkbox
                                                checked={checkboxField.value}
                                                onCheckedChange={checkboxField.onChange}
                                                aria-label={`${permDetails.label} for ${formatRoleName(field.role)}`}
                                            />
                                        )}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                     )
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <CardFooter className="flex justify-end sticky bottom-0 py-4 bg-background/80 backdrop-blur-sm z-10 rounded-lg border-t mt-4">
            <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save All Permissions
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
