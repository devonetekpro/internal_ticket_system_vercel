
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layout/app-sidebar";
import { SiteHeader } from "@/components/Layout/site-header";
import { PermissionsProvider, type PermissionRecord } from "@/components/providers/permissions-provider";
import { createClient } from "@/lib/supabase/server";
import type { Database, RolePermissions } from "@/lib/database.types";
import { redirect } from "next/navigation";
import { getCrmTickets } from "@/services/crm-service";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, rolePermsResult, crmTicketsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, avatar_url, username, departments ( name )")
      .eq("id", user.id)
      .single<
        Database["public"]["Tables"]["profiles"]["Row"] & {
          departments: { name: string } | null;
        }
      >(),
    supabase
      .from('role_permissions')
      .select('*'), // Select all permissions to build a detailed map
    getCrmTickets({ pageSize: 1, view: 'waiting_for_response' })
  ]);
  
  const { data: profile } = profileResult;
  const { data: rolePermsData } = rolePermsResult;
  const { counts: crmTicketCounts } = crmTicketsResult;
  
  if (!profile) {
    redirect('/login?message=Your profile is still being created. Please wait a moment and log in again.');
  }

  const initialPermissions: PermissionRecord[] = (rolePermsData || []).map(p => ({
    role: p.role,
    permission: p.permission,
    department_id: p.department_id
  }));
  
  const userContext = {
    role: profile.role,
    department_id: (await supabase.from('profiles').select('department_id').eq('id', user.id).single()).data?.department_id ?? null
  };
  
  const crmWaitingCount = crmTicketCounts.waiting_for_response;

  return (
    <PermissionsProvider initialPermissions={initialPermissions} userContext={userContext}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
      <div className="flex w-screen overflow-x-hidden"> 
        <AppSidebar user={user} profile={profile} crmWaitingCount={crmWaitingCount} variant="inset"/>
        <SidebarInset className="flex-1 min-w-0"> 
          <SiteHeader />
          <div className="min-w-0">{children}</div>
        </SidebarInset>
      </div>
      </SidebarProvider>
    </PermissionsProvider>
  );
}
