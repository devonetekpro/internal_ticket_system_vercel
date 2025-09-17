
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationAsRead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return { success: false, message: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function markAllNotificationsAsRead() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Not authenticated.' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    if (error) {
        console.error('Failed to mark all notifications as read:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
