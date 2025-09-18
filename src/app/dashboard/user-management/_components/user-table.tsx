
'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Edit, Search, ListFilter, RotateCcw, Trash2, Loader2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import type { Database, Department, UserRole } from '@/lib/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, canManage } from '@/lib/utils';
import EditUserDialog from './edit-user-dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { allUserRoles } from '@/lib/database.types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteUser as deactivateUser } from '../_actions/delete-user';
import { hardDeleteUser } from '../_actions/hard-delete-user';
import { toast } from 'sonner';
import { usePermissions } from '@/components/providers/permissions-provider';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    departments: { name: string } | null;
};

const roleColors: { [key: string]: string } = {
  system_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  department_head: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  ceo: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  agent: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  user: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const formatRole = (role: string | undefined | null) => {
    if (!role) return 'N/A'
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
};

interface UserTableProps {
    initialProfiles: Profile[];
    departments: Department[];
    managingUserRole: UserRole;
}

export function UserTable({ initialProfiles, departments, managingUserRole }: UserTableProps) {
    const [profiles, setProfiles] = useState(initialProfiles);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const { hasPermission, userContext } = usePermissions();

    // Permissions for actions
    const canDeactivate = ['system_admin', 'ceo', 'super_admin'].includes(managingUserRole);
    const canHardDelete = ['system_admin', 'ceo', 'super_admin'].includes(managingUserRole);
    const canViewDeactivated = canDeactivate || canHardDelete;

    const { activeProfiles, deactivatedProfiles } = useMemo(() => {
        let manageableProfiles = profiles;
        
        if (managingUserRole === 'department_head' && userContext?.department_id) {
            manageableProfiles = profiles.filter(
                p => p.department_id === userContext.department_id
            );
        }

        const filtered = manageableProfiles.filter(profile => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                profile.full_name?.toLowerCase().includes(searchLower) ||
                profile.username?.toLowerCase().includes(searchLower) ||
                profile.email?.toLowerCase().includes(searchLower)
            );
            const matchesRole = !selectedRole || profile.role === selectedRole;
            const matchesDepartment = !selectedDepartment || profile.department_id === selectedDepartment;
            
            return matchesSearch && matchesRole && matchesDepartment;
        });

        return {
            activeProfiles: filtered.filter(p => !p.deleted_at),
            deactivatedProfiles: filtered.filter(p => !!p.deleted_at),
        };
    }, [profiles, searchQuery, selectedRole, selectedDepartment, managingUserRole, userContext]);

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedRole(null);
        setSelectedDepartment(null);
    };

    const handleDeactivateUser = async (userId: string) => {
        setIsProcessing(userId);
        const result = await deactivateUser(userId);
        if (result.success) {
            toast.success(result.message);
            // Optimistically move user to deactivated list
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, deleted_at: new Date().toISOString() } : p));
        } else {
            toast.error(result.message);
        }
        setIsProcessing(null);
    };

    const handleHardDeleteUser = async (userId: string) => {
        setIsProcessing(userId);
        const result = await hardDeleteUser(userId);
        if (result.success) {
            toast.success(result.message);
            setProfiles(prev => prev.filter(p => p.id !== userId));
        } else {
            toast.error(result.message);
        }
        setIsProcessing(null);
    };
    
    const renderTable = (profileList: Profile[], isDeactivatedTable: boolean) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>{isDeactivatedTable ? 'Deactivated At' : 'Last Updated'}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {profileList.map((profile) => {
                   const userCanBeManaged = profile.role ? canManage(managingUserRole, profile.role) : false;
                   return (
                    <TableRow key={profile.id} className={isDeactivatedTable ? 'opacity-60 bg-muted/30' : ''}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={profile.avatar_url ?? ''} />
                                    <AvatarFallback>{getInitials(profile.full_name, profile.username, profile.email)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium">{profile.full_name ?? profile.username}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-sm text-muted-foreground">{profile.email}</span>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`capitalize ${roleColors[profile.role ?? 'user']}`}>
                                <Shield className="h-3 w-3 mr-1" />
                                {formatRole(profile.role)}
                            </Badge>
                        </TableCell>
                        <TableCell>{profile.departments?.name ?? 'N/A'}</TableCell>
                        <TableCell>
                            {isDeactivatedTable 
                                ? (profile.deleted_at ? format(new Date(profile.deleted_at), 'PP') : 'N/A')
                                : (profile.updated_at ? formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true }) : 'Never')
                            }
                        </TableCell>
                        <TableCell className="text-right">
                          {userCanBeManaged && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isProcessing === profile.id}>
                                        {isProcessing === profile.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {!isDeactivatedTable && (
                                        <DropdownMenuItem asChild>
                                             <EditUserDialog 
                                                profile={profile} 
                                                departments={departments ?? []}
                                                managingUserRole={managingUserRole}
                                            >
                                                <button className="w-full  flex items-center gap-4 px-2 py-1.5 ">
                                                    <Edit className="h-4 w-4" /> Edit User
                                                </button>
                                            </EditUserDialog>
                                        </DropdownMenuItem>
                                    )}
                                    {!isDeactivatedTable && canDeactivate && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Deactivate User
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Deactivate User: {profile.full_name ?? profile.username}?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will prevent the user from logging in but keeps all their data. Are you sure?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeactivateUser(profile.id)}>Confirm Deactivation</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    {(isDeactivatedTable || canHardDelete) && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                        <AlertTriangle className="h-4 w-4 mr-2" /> Permanently Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-destructive">Permanently Delete User?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action is irreversible. All tickets, comments, and data associated with <b>{profile.full_name ?? profile.username}</b> will be permanently lost.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleHardDeleteUser(profile.id)} className="bg-destructive hover:bg-destructive/90">I understand, delete permanently</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                    </TableRow>
                   )})}
                {profileList.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No users match the current filters.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
         </Table>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, username, or email..."
                        className="w-full rounded-lg bg-background pl-8 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 gap-1">
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Role
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allUserRoles.map(role => (
                            <DropdownMenuCheckboxItem
                                key={role}
                                checked={selectedRole === role}
                                onSelect={() => setSelectedRole(prev => prev === role ? null : role)}
                            >
                                {formatRole(role)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 gap-1">
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Department
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Department</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {departments.map(dept => (
                            <DropdownMenuCheckboxItem
                                key={dept.id}
                                checked={selectedDepartment === dept.id}
                                onSelect={() => setSelectedDepartment(prev => prev === dept.id ? null : dept.id)}
                            >
                                {dept.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={resetFilters} variant="ghost" size="sm" className="h-10">
                    <RotateCcw className="mr-2 h-4 w-4"/>
                    Reset
                </Button>
            </div>
            {renderTable(activeProfiles, false)}

            {canViewDeactivated && deactivatedProfiles.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-lg font-semibold mb-4">Deactivated Users</h3>
                    {renderTable(deactivatedProfiles, true)}
                </div>
            )}
        </div>
    );
}
