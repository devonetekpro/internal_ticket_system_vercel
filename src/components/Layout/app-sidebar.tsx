
'use client'

import React from "react";
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
import { Database, PermissionKey } from "@/lib/database.types";
import NavLink from "@/app/dashboard/nav-link";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { NavUser } from "../nav-user";
import { usePermissions } from "../providers/permissions-provider";
import type { User } from "@supabase/supabase-js";
import { Skeleton } from "../ui/skeleton";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & { departments: { name: string } | null };

type NavLinkItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  permission?: PermissionKey;
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
  const { hasPermission, isLoading } = usePermissions();

  // const allNavGroups: NavGroup[] = [
  //   {
  //     title: "Workspace",
  //     links: [
  //       {
  //         href: "/dashboard",
  //         icon: LayoutGrid,
  //         label: "Dashboard",
  //         exact: true,
  //       },
  //       {
  //         href: "/dashboard/crm-tickets",
  //         icon: MessageSquare,
  //         label: "CRM Desk",
  //         permission: "access_crm_tickets",
  //         badge: crmWaitingCount,
  //       },
  //       {
  //         href: "/dashboard/tickets",
  //         icon: TicketIcon,
  //         label: "Internal Desk",
  //         permission: 'create_tickets', 
  //       },
  //       {
  //           href: "/dashboard/tasks",
  //           icon: ClipboardCheck,
  //           label: "Task Board",
  //           permission: 'view_task_board',
  //       },
  //        {
  //         href: "/dashboard/live-chat",
  //         icon: MessageCircleHeart,
  //         label: "Live Chat",
  //         permission: "access_live_chat",
  //       },
  //       {
  //         href: "/dashboard/analytics",
  //         icon: BarChart,
  //         label: "Analytics",
  //         permission: "view_analytics",
  //       },
  //       {
  //         href: "/dashboard/knowledge-base",
  //         icon: Book,
  //         label: "Knowledge Base",
  //         permission: "access_knowledge_base",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Administration",
  //     links: [
  //       {
  //         href: "/dashboard/role-permissions",
  //         icon: Shield,
  //         label: "Role Permissions",
  //         permission: "manage_roles",
  //       },
  //       {
  //         href: "/dashboard/user-management",
  //         icon: Users,
  //         label: "User Management",
  //         permission: "manage_all_users",
  //       },
  //       {
  //         href: "/dashboard/admin-panel",
  //         icon: Settings,
  //         label: "Admin Panel",
  //         permission: "access_admin_panel",
  //       },
  //     ],
  //   },
  // ];

  const allNavGroups: NavGroup[] = React.useMemo(() => [
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
          permission: "access_crm_tickets",
          badge: crmWaitingCount,
        },
        {
          href: "/dashboard/tickets",
          icon: TicketIcon,
          label: "Internal Desk",
          permission: 'create_tickets', 
        },
        {
            href: "/dashboard/tasks",
            icon: ClipboardCheck,
            label: "Task Board",
            permission: 'view_task_board',
        },
         {
          href: "/dashboard/live-chat",
          icon: MessageCircleHeart,
          label: "Live Chat",
          permission: "access_live_chat",
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
  ], [crmWaitingCount]);

  const navGroups = React.useMemo(() => allNavGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => !link.permission || hasPermission(link.permission)),
    }))
    .filter((group) => group.links.length > 0), [allNavGroups, hasPermission]);

  if (isLoading) {
      return  <aside className="w-[var(--sidebar-width)] p-4 space-y-4 border-r">
                <Skeleton className="h-10 w-40" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-2 pt-8">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </aside>;
  }
  
  const getDisplayName = () => {
    if (!profile) return "Unknown User";
    if (profile.role === 'department_head' && profile.departments?.name) {
      return `${profile.departments.name} Head`;
    }
    return profile.full_name ?? profile.username ?? "Unknown User";
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
            name: getDisplayName(),
            avatar: profile?.avatar_url || "",
            email: user.email ?? "No Email",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
