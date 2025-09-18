
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardFooter, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RolePermissions, UserRole, PermissionKey, Department } from '@/lib/database.types';
import { updateRolePermissions } from '../_actions/update-role-permissions';
import { toast } from 'sonner';
import { Loader2, Shield, ChevronsUpDown, Check, Building } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

interface PermissionsTableProps {
  initialPermissions: RolePermissions[];
  permissionGroups: Record<string, { title: string; permissions: Record<string, { label: string; description: string; }> }>;
  allPermissionKeys: PermissionKey[];
  manageableRoles: UserRole[];
  allDepartments: Department[];
}

const formatRoleName = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const PermissionSelector = ({
  allDepartments,
  selectedDepartments,
  onChange,
}: {
  allDepartments: Department[];
  selectedDepartments: string[];
  onChange: (value: string[]) => void;
}) => {
    const [open, setOpen] = React.useState(false);
    const isGlobal = selectedDepartments.includes('ALL');

    const handleSelect = (deptId: string) => {
        let newSelection: string[];
        const wasSelected = selectedDepartments.includes(deptId);

        if (deptId === 'ALL') {
            newSelection = isGlobal ? [] : ['ALL'];
        } else {
            if (wasSelected) {
                newSelection = selectedDepartments.filter(id => id !== deptId && id !== 'ALL');
            } else {
                newSelection = [...selectedDepartments.filter(id => id !== 'ALL'), deptId];
            }
        }
        onChange(newSelection);
    };
    
    const getButtonLabel = () => {
        if (isGlobal) return "All Departments";
        if (selectedDepartments.length === 0) return "No Access";
        if (selectedDepartments.length === 1) {
            return allDepartments.find(d => d.id === selectedDepartments[0])?.name ?? '1 Department';
        }
        return `${selectedDepartments.length} Departments`;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-[200px] justify-between h-auto py-1 text-left font-normal">
                    <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground">Access Level</span>
                        <span className="font-medium">{getButtonLabel()}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search departments..." />
                    <ScrollArea className="h-64">
                    <CommandList>
                        <CommandEmpty>No departments found.</CommandEmpty>
                        <CommandGroup>
                             <CommandItem onSelect={() => handleSelect('ALL')}>
                                <Check className={cn("mr-2 h-4 w-4", isGlobal ? "opacity-100" : "opacity-0")} />
                                Grant for All Departments
                            </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Grant for Specific Departments">
                            {allDepartments.map(dept => (
                                <CommandItem key={dept.id} onSelect={() => handleSelect(dept.id)}>
                                    <Check className={cn("mr-2 h-4 w-4", selectedDepartments.includes(dept.id) && !isGlobal ? "opacity-100" : "opacity-0")} />
                                    {dept.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    </ScrollArea>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function PermissionsTable({
  initialPermissions,
  permissionGroups,
  allPermissionKeys,
  manageableRoles,
  allDepartments,
}: PermissionsTableProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const displayRoles = React.useMemo(() => {
    // Filter out 'ceo' from the display list
    const rolesToDisplay = manageableRoles.filter(role => role !== 'ceo');
    return rolesToDisplay.map(role => ({
      id: role,
      label: formatRoleName(role),
      role: role,
    }));
  }, [manageableRoles]);

  const form = useForm({
    defaultValues: {
      permissions: allPermissionKeys.flatMap(key => {
        return manageableRoles.map(role => {
            const relevantPerms = initialPermissions.filter(p => p.role === role && p.permission === key);
            const globalPerm = relevantPerms.find(p => p.department_id === null);
            
            let departments: string[] = [];
            if (globalPerm) {
                departments = ['ALL'];
            } else {
                departments = relevantPerms.map(p => p.department_id).filter(Boolean) as string[];
            }
            return { permission: key, role, departments };
        });
      }),
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    const result = await updateRolePermissions(data.permissions);
    if (result.success) {
        toast.success(result.message);
    } else {
        toast.error(result.message);
    }
    setIsSubmitting(false);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="shadow-none border-0">
            <CardHeader className="p-0 mb-6">
                <CardTitle className="mb-4">Configure Role Permissions</CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
                <Accordion type="multiple" defaultValue={Object.keys(permissionGroups)} className="w-full space-y-4">
                    {Object.entries(permissionGroups).map(([groupKey, group]) => (
                        <AccordionItem value={groupKey} key={groupKey} className="border-b-0 rounded-lg border overflow-hidden">
                            <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline hover:bg-muted/80">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <h2 className="font-semibold text-lg">{group.title}</h2>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                                {Object.entries(group.permissions).map(([permKey, permDetails]) => {
                                    return (
                                        <div key={permKey} className="grid grid-cols-1 md:grid-cols-[2fr_3fr] p-4 border-t items-start">
                                            <div>
                                                <p className="font-semibold text-base">{permDetails.label}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{permDetails.description}</p>
                                            </div>
                                            <div className="space-y-3 pt-4 md:pt-0">
                                                {displayRoles.map(displayRole => {
                                                    const permissionIndex = form.getValues('permissions').findIndex(p => p.permission === permKey && p.role === displayRole.role);
                                                     if (permissionIndex === -1) return null;
                                                     
                                                    return (
                                                        <Controller
                                                            key={displayRole.id}
                                                            control={form.control}
                                                            name={`permissions.${permissionIndex}.departments`}
                                                            render={({ field }) => (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        {displayRole.role === 'department_head' && <Building className="h-4 w-4 text-muted-foreground" />}
                                                                        <span className="font-medium text-sm">{displayRole.label}</span>
                                                                    </div>
                                                                    <PermissionSelector
                                                                        allDepartments={allDepartments}
                                                                        selectedDepartments={field.value}
                                                                        onChange={field.onChange}
                                                                    />
                                                                </div>
                                                            )}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            <CardFooter className="flex justify-end sticky bottom-0 py-4 bg-background/80 backdrop-blur-sm z-10 border-t mt-4 -mx-4 px-4">
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

    