
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UserRole } from "./database.types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string | undefined | null, username: string | undefined | null, email?: string | undefined | null) => {
  if (name) {
      return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
  }
  if (username) {
      return username.substring(0, 2).toUpperCase();
  }
  if (email) {
      return email.substring(0, 1).toUpperCase()
  }
  return '?'
}

/**
 * Determines if a user with a given role can manage another user with a target role.
 * This function enforces the role hierarchy.
 * @param managingRole The role of the user trying to perform the action.
 * @param targetRole The role of the user being managed.
 * @returns True if the action is permitted, false otherwise.
 */
export function canManage(managingRole: UserRole, targetRole: UserRole): boolean {
    if (managingRole === 'system_admin') {
        // System admins can manage anyone except other system admins
        return targetRole !== 'system_admin';
    }
    if (managingRole === 'ceo') {
        // CEOs can manage anyone except system admins
        return targetRole !== 'system_admin';
    }
    if (managingRole === 'admin') {
        // Admins can manage anyone except system admins and ceos
        return !['system_admin', 'ceo'].includes(targetRole);
    }
    // Other roles (manager, agent, etc.) cannot manage users through this system.
    return false;
}
