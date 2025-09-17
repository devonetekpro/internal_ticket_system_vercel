
'use client';

import React, { createContext, useContext, useState } from 'react';
import type { PermissionKey } from '@/lib/database.types';

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
    // system_admin role has all permissions implicitly.
    if (permissions['role'] === 'system_admin') {
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
