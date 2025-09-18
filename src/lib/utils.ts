
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

// Defines the power level of each role, lower is more powerful.
const roleHierarchy: Record<UserRole, number> = {
  system_admin: 0,
  super_admin: 1,
  ceo: 2,
  admin: 3,
  department_head: 4,
  agent: 5,
  user: 6,
};


/**
 * Determines if a user with a given role can manage another user with a target role.
 * This function enforces the role hierarchy.
 * @param managingRole The role of the user trying to perform the action.
 * @param targetRole The role of the user being managed.
 * @returns True if the action is permitted, false otherwise.
 */
export function canManage(managingRole: UserRole, targetRole: UserRole): boolean {
    const managingLevel = roleHierarchy[managingRole];
    const targetLevel = roleHierarchy[targetRole];

    // A user can manage another user if their hierarchy level is lower (more powerful)
    // and they are not trying to manage someone at their own level or higher.
    return managingLevel < targetLevel;
}

/**
 * Returns a list of roles that a user with the given role can assign.
 * @param managingRole The role of the administrator.
 * @returns An array of assignable UserRole strings.
 */
export function getAssignableRoles(managingRole: UserRole): UserRole[] {
    const managingLevel = roleHierarchy[managingRole];
    const allRoles = Object.keys(roleHierarchy) as UserRole[];
    
    // An admin can assign any role that is lower in the hierarchy than their own.
    return allRoles.filter(role => roleHierarchy[role] > managingLevel);
}

    