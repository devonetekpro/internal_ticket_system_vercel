
'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Icon } from "@iconify/react";

import {
  LayoutGrid,
  Users,
  Ticket as TicketIcon,
  MessageSquare,
  BarChart,
  Book,
  Shield,
  Settings,
  PlusCircle,
  MessageCircleHeart,
  ClipboardCheck,
} from "lucide-react";
import { Database } from "@/lib/database.types";
import NavLink from "@/app/dashboard/nav-link";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { NavUser } from "../nav-user";
import { usePermissions } from "../providers/permissions-provider";
import type { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & { departments: { name: string } | null };

type NavLinkItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  permission?: any;
  departmentPermission?: string;
  badge?: number;
  exact?: boolean;
};

type NavGroup = {
  title: string;
  links: NavLinkItem[];
};


export function AppSidebar({
  user,
  profile,
  crmWaitingCount,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; profile: Profile | null, crmWaitingCount: number }) {
  const { hasPermission, isLoading, permissions } = usePermissions();
  const userDepartment = permissions['department'] as string;

  const allNavGroups: NavGroup[] = [
    {
      title: "Workspace",
      links: [
        {
          href: "/dashboard",
          icon: LayoutGrid,
          label: "Dashboard",
          exact: true,
        },
        {
          href: "/dashboard/crm-tickets",
          icon: MessageSquare,
          label: "CRM Desk",
          departmentPermission: 'backoffice',
          badge: crmWaitingCount,
        },
        {
          href: "/dashboard/tickets",
          icon: TicketIcon,
          label: "Internal Desk",
        },
        {
            href: "/dashboard/tasks",
            icon: ClipboardCheck,
            label: "Task Board",
        },
         {
          href: "/dashboard/live-chat",
          icon: MessageCircleHeart,
          label: "Live Chat",
          departmentPermission: 'backoffice',
        },
        {
          href: "/dashboard/analytics",
          icon: BarChart,
          label: "Analytics",
          permission: "view_analytics",
        },
        {
          href: "/dashboard/knowledge-base",
          icon: Book,
          label: "Knowledge Base",
          permission: "access_knowledge_base",
        },
      ],
    },
    {
      title: "Administration",
      links: [
        {
          href: "/dashboard/role-permissions",
          icon: Shield,
          label: "Role Permissions",
          permission: "manage_roles",
        },
        {
          href: "/dashboard/user-management",
          icon: Users,
          label: "User Management",
          permission: "manage_all_users",
        },
        {
          href: "/dashboard/admin-panel",
          icon: Settings,
          label: "Admin Panel",
          permission: "access_admin_panel",
        },
      ],
    },
  ];

  const navGroups = allNavGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => {
        const hasRolePerm = !link.permission || hasPermission(link.permission);
        const hasDeptPerm = !link.departmentPermission || userDepartment === link.departmentPermission || hasPermission('manage_all_users');
        return hasRolePerm && hasDeptPerm;
      }),
    }))
    .filter((group) => group.links.length > 0);

  if (isLoading) {
      return  <div className="w-[var(--sidebar-width)] p-4 space-y-4">
                <div className="h-10"></div>
                <div className="space-y-2">
                    <div className="h-8 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-8 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-8 w-full bg-muted animate-pulse rounded-md" />
                </div>
            </div>;
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size={"lg"}
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="w-10 h-auto">
                  <Icon
                    icon="streamline-pixel:email-mail-chat"
                    width="42"
                    height="42"
                    className="text-primary"
                  />
                </span>
                <span className="font-bold sm:inline-block text-2xl font-headline">
                  HelpFlow
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
             {hasPermission('create_tickets') && (
                <SidebarMenu>
                  <SidebarMenuItem className="flex items-center gap-2">
                    <SidebarMenuButton
                      tooltip="Quick Create"
                      asChild
                      className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                    >
                      <NavLink
                        href="/dashboard/create-ticket"
                        label="Create Ticket"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 mb-4 mt-2"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Create Ticket</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
             )}
            <SidebarMenu>
              {navGroups.map((group) => (
                <div key={group.title} className="py-2">
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </h3>
                  {group.links.map((link) => (
                    <NavLink
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      label={link.label}
                      exact={link.exact}
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                      {link.badge && link.badge > 0 ? (
                        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          {link.badge}
                        </Badge>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: profile?.full_name ?? profile?.username ?? "Unknown User",
            avatar: profile?.avatar_url || "",
            email: user.email ?? "No Email",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
