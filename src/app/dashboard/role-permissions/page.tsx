
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import type { Database, RolePermissions } from '@/lib/database.types';
import PermissionsTable from './_components/permissions-table';
import { checkPermission } from '@/lib/helpers/permissions';

export const dynamic = 'force-dynamic';

type UserRole = Database['public']['Enums']['user_role'];

// Define all possible permissions available in the system, grouped by category.
export const permissionGroups = {
  general: {
    title: 'General Access',
    permissions: {
      view_analytics: {
        label: 'View Analytics Page',
        description: 'User can access the main analytics and reporting dashboard.'
      },
      access_knowledge_base: {
        label: 'Access Knowledge Base',
        description: 'User can view articles in the internal knowledge base.'
      },
      create_tickets: {
        label: 'Create Tickets',
        description: 'Allows the user to create new internal support tickets.'
      },
    },
  },
  ticket_management: {
    title: 'Ticket Management',
    permissions: {
      view_all_tickets_in_department: {
        label: 'View All Tickets in Own Department',
        description: 'Allows viewing of all tickets assigned to their department, not just their own.'
      },
      change_ticket_status: {
        label: 'Change Ticket Progress Status',
        description: 'User can change ticket status (e.g., from Open to In Progress).'
      },
      delete_tickets: {
        label: 'Delete Tickets',
        description: 'Allows permanent deletion of tickets. (Use with caution)'
      },
      edit_ticket_properties: {
        label: 'Edit Ticket Details',
        description: 'User can edit properties like Priority, Category, etc.'
      },
      assign_tickets: {
        label: 'Assign Tickets to Users/Departments',
        description: 'Allows re-assigning tickets to other users or departments.'
      },
    },
  },
  user_management: {
    title: 'User Management',
    permissions: {
       manage_all_users: {
        label: 'Manage All Users',
        description: 'Grants access to the user management page to edit any user.'
      },
      manage_users_in_department: {
        label: 'Manage Users in Own Department',
        description: 'User can edit roles and details for other users within the same department.'
      },
    }
  },
  system_administration: {
    title: 'System Administration',
    permissions: {
        access_admin_panel: {
            label: 'Access Admin Panel',
            description: 'Grants access to the main system administration panel.'
        },
        manage_departments: {
          label: 'Manage Departments',
          description: 'Allows creating, editing, and deleting departments within the Admin Panel.'
        },
        manage_templates: {
          label: 'Manage Ticket Templates',
          description: 'Allows creating and editing quick-start ticket templates within the Admin Panel.'
        },
        manage_knowledge_base: {
          label: 'Manage Knowledge Base',
          description: 'Allows uploading and deleting documents for the AI Assistant.'
        },
        manage_sla_policies: {
          label: 'Manage SLA Policies',
          description: 'Allows configuration of Service Level Agreement rules within the Admin Panel.'
        },
        manage_chat_settings: {
          label: 'Manage Chat Settings',
          description: 'Allows managing settings for the AI chat widget, like prefilled questions.'
        },
        manage_roles: {
            label: 'Manage Roles & Permissions',
            description: 'Grants access to this permissions page to modify what roles can do.'
        }
    }
  }
};

// Flatten the permissions for easier lookup.
export const allPermissions = Object.values(permissionGroups).reduce((acc, group) => {
    return { ...acc, ...group.permissions };
}, {} as Record<string, { label: string, description: string }>);

export type PermissionKey = keyof typeof allPermissions;


// Define which roles are manageable in the UI
const manageableRoles: UserRole[] = ['admin', 'manager', 'agent', 'user', 'department_head', 'ceo', 'system_admin', 'super_admin'];

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

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Only system admins and ceos can access this page
  if (!currentUserProfile || !['system_admin', 'super_admin', 'ceo'].includes(currentUserProfile.role ?? '')) {
    return redirect('/dashboard?error=unauthorized');
  }

  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select('*')
    .in('role', manageableRoles)
    .returns<RolePermissions[]>();

  if (error) {
    console.error('Error fetching role permissions:', error);
    // You might want to show an error component here
  }
  
  if (!permissions) {
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
            Define what each role can see and do within the application.
          </p>
        </div>
      </div>

      <PermissionsTable 
        initialPermissions={permissions} 
        permissionGroups={permissionGroups}
        manageableRoles={manageableRoles}
      />
    </main>
  );
}
