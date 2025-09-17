
// This page has been moved to /dashboard/account
import { redirect } from 'next/navigation'

export default function OldAccountPage() {
  redirect('/dashboard/account')
  return null
}
