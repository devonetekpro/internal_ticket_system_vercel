
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Database, UserRole } from '@/lib/database.types';
import { checkPermission } from '@/lib/helpers/permissions';
import { UserTable } from './_components/user-table';

export const dynamic = 'force-dynamic'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    departments: { name: string } | null;
};

// This is now a server component that fetches the data
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

    const { data: currentUserProfile, error: currentUserProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (currentUserProfileError || !currentUserProfile?.role) {
        console.error('Error fetching current user profile:', currentUserProfileError);
        redirect('/dashboard?error=profile_not_found');
    }

    // Fetch all profiles and departments in parallel
    const [profilesResult, departmentsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select(`*, departments (name)`)
            .order('updated_at', { ascending: false }),
        supabase.from('departments').select('*')
    ]);

    const { data: profilesData, error: profilesError } = profilesResult;
    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    }
    
    const profiles = (profilesData as Profile[]) ?? [];
    const departments = departmentsResult.data ?? [];

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
                 <UserTable 
                    initialProfiles={profiles} 
                    departments={departments} 
                    managingUserRole={currentUserProfile.role} 
                 />
            </CardContent>
         </Card>
    </main>
  )
}
