
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import type { Database, RolePermissions, UserRole, Department } from '@/lib/database.types';
import PermissionsTable from './_components/permissions-table';
import { checkPermission } from '@/lib/helpers/permissions';
import { permissionGroups, allPermissionKeys, manageableRoles } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default async function RolePermissionsPage() {
    const canAccess = await checkPermission('manage_roles');
    if (!canAccess) {
        redirect('/dashboard?error=unauthorized');
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    const [permissionsResult, departmentsResult] = await Promise.all([
        supabase.from('role_permissions').select('*').in('role', manageableRoles),
        supabase.from('departments').select('*'),
    ]);
    
    const { data: permissions, error: permissionsError } = permissionsResult;
    const { data: departments, error: departmentsError } = departmentsResult;

    if (permissionsError || departmentsError) {
        console.error('Error fetching permissions or departments:', permissionsError || departmentsError);
        notFound();
    }
  
    if (!permissions || !departments) {
        notFound();
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center gap-4">
            <div>
            <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" /> Role Permissions
            </h1>
            <p className="text-muted-foreground">
                Define what each role can see and do within specific departments.
            </p>
            </div>
        </div>

        <PermissionsTable 
            initialPermissions={permissions as RolePermissions[]} 
            permissionGroups={permissionGroups}
            allPermissionKeys={allPermissionKeys as PermissionKey[]}
            manageableRoles={manageableRoles}
            allDepartments={departments as Department[]}
        />
        </main>
    );
}
