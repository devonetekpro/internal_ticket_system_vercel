

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/lib/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import EditUserDialog from './_components/edit-user-dialog';
import { checkPermission } from '@/lib/helpers/permissions';

export const dynamic = 'force-dynamic'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    departments: { name: string } | null;
};

const roleColors: { [key: string]: string } = {
  system_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
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

// This is now a server component
export default async function UserManagementPage() {
    const canAccess = await checkPermission('manage_all_users');
    if (!canAccess) {
        redirect('/dashboard?error=unauthorized');
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch all profiles from the public schema
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`*, departments (name)`)
        .order('updated_at', { ascending: false });

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    }
    
    const profiles = (profilesData as Profile[]) ?? [];

    const { data: departmentsData } = await supabase.from('departments').select('*');
    
  return (
    <main className="flex-1 flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center">
            <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8 text-primary"/> User Management</h1>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                    View and manage all users in the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                         {profiles.map((profile) => (
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
                                   <EditUserDialog 
                                        profile={profile} 
                                        departments={departmentsData ?? []}
                                    >
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </EditUserDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {profiles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No users found or still loading...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
         </Card>
    </main>
  )
}
