import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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