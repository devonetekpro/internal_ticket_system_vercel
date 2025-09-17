
'use client';

import React, { createContext, useContext, useState } from 'react';

export type PermissionKey =
  | 'view_analytics'
  | 'access_knowledge_base'
  | 'manage_knowledge_base'
  | 'view_all_tickets_in_department'
  | 'change_ticket_status'
  | 'delete_tickets'
  | 'edit_ticket_properties'
  | 'assign_tickets'
  | 'manage_users_in_department'
  | 'manage_departments'
  | 'manage_templates'
  | 'access_admin_panel'
  | 'create_tickets'
  | 'manage_all_users'
  | 'manage_roles'
  | 'manage_sla_policies'
  | 'manage_chat_settings';


type PermissionsContextType = {
  permissions: Record<string, boolean>;
  isLoading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children, initialPermissions }: { children: React.ReactNode, initialPermissions: Record<string, boolean> }) => {
  const [permissions] = useState<Record<string, boolean>>(initialPermissions);
  const [isLoading] = useState(false); // Always false as data is provided by server

  const hasPermission = (key: PermissionKey): boolean => {
    // Implicitly grant all permissions for these roles client-side
    // This is for UI purposes. Server-side actions still perform the real checks.
    if (permissions['role'] === 'system_admin' || permissions['role'] === 'super_admin' || permissions['role'] === 'ceo') {
      return true;
    }
    return !!permissions[key];
  };

  const value = { permissions, isLoading, hasPermission };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
