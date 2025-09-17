
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
import { Shield, Users, Edit, Search, ListFilter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { Database, Department, UserRole } from '@/lib/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, canManage } from '@/lib/utils';
import EditUserDialog from './edit-user-dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { allUserRoles } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    departments: { name: string } | null;
};

const roleColors: { [key: string]: string } = {
  system_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  department_head: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  ceo: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  manager: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

    const filteredProfiles = useMemo(() => {
        return initialProfiles.filter(profile => {
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
    }, [initialProfiles, searchQuery, selectedRole, selectedDepartment]);

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedRole(null);
        setSelectedDepartment(null);
    };

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
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {filteredProfiles.map((profile) => {
                       const userCanBeManaged = profile.role ? canManage(managingUserRole, profile.role) : false;
                       return (
                        <TableRow key={profile.id}>
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
                                {profile.updated_at ? formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true }) : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              {userCanBeManaged ? (
                               <EditUserDialog 
                                    profile={profile} 
                                    departments={departments ?? []}
                                >
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </EditUserDialog>
                              ) : (
                                <Button variant="ghost" size="icon" disabled>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                        </TableRow>
                     )})}
                    {filteredProfiles.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No users match the current filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
        </div>
    );
}
