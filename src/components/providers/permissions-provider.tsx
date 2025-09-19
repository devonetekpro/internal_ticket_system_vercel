
'use client';

import React, { createContext, useContext, useState } from 'react';
import type { PermissionKey, RolePermissions, UserRole } from '@/lib/database.types';

export type PermissionRecord = Pick<RolePermissions, 'role' | 'permission' | 'department_id'>;

export type UserContext = {
  role: UserRole | null;
  department_id: string | null;
}

type PermissionsContextType = {
  permissions: PermissionRecord[];
  userContext: UserContext | null;
  isLoading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ 
  children, 
  initialPermissions,
  userContext: initialUserContext
}: { 
  children: React.ReactNode, 
  initialPermissions: PermissionRecord[],
  userContext: UserContext | null,
}) => {
  const [permissions] = useState<PermissionRecord[]>(initialPermissions);
  const [userContext] = useState<UserContext | null>(initialUserContext);
  const [isLoading] = useState(false); // Always false as data is provided by server

  const hasPermission = (key: PermissionKey): boolean => {
    if (!userContext || !userContext.role) {
      return false;
    }

    // System admins and CEOs have all permissions implicitly.
    if (['system_admin', 'super_admin', 'ceo'].includes(userContext.role)) {
      return true;
    }
    
    // Find all permissions for the user's role that match the key.
    const relevantPermissions = permissions.filter(
      p => p.role === userContext.role && p.permission === key
    );

    if (relevantPermissions.length === 0) {
      return false;
    }

    // Check if there is a global permission (department_id is null)
    const hasGlobalPermission = relevantPermissions.some(p => p.department_id === null);
    if (hasGlobalPermission) {
      return true;
    }
    
    // If it's a department-specific role, check if they have permission for their department
    if (userContext.department_id) {
       const hasDepartmentPermission = relevantPermissions.some(p => p.department_id === userContext.department_id);
       if (hasDepartmentPermission) {
           return true;
       }
    }

    return false;
  };

  const value = { permissions, userContext, isLoading, hasPermission };

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
