
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layout/app-sidebar";
import { SiteHeader } from "@/components/Layout/site-header";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
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

  // Fetch only the most essential data for the layout
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
      .select('*')
      .eq('role', (await supabase.from('profiles').select('role').eq('id', user.id).single()).data?.role ?? 'user'),
    getCrmTickets({ pageSize: 1, view: 'waiting_for_response' })
  ]);
  
  const { data: profile } = profileResult;
  const { data: rolePermsData } = rolePermsResult;
  const { counts: crmTicketCounts } = crmTicketsResult;
  
  if (!profile) {
    // This can happen if the profile hasn't been created yet after signup.
    // Redirect to a safe page or show an interstitial.
    redirect('/login?message=Your profile is still being created. Please wait a moment and log in again.');
  }

  const initialPermissions: Record<string, boolean> = {};
  if (rolePermsData) {
      rolePermsData.forEach(perm => {
          // For now, we simplify to a true/false check. Departmental logic is handled server-side.
          initialPermissions[perm.permission] = true;
      });
  }
  
  if (profile.role) {
    initialPermissions['role'] = profile.role as any;
  }
  if (profile.departments?.name) {
    initialPermissions['department'] = profile.departments.name as any;
  }
  
  const crmWaitingCount = crmTicketCounts.waiting_for_response;

  return (
    <PermissionsProvider initialPermissions={initialPermissions}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar user={user} profile={profile} crmWaitingCount={crmWaitingCount} variant="inset"/>
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProvider>
  );
}
