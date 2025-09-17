
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AvatarUploader } from './avatar-uploader'
import { useRouter } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'

type Profile = Database['public']['Tables']['profiles']['Row'] & { departments: { name: string } | null };

export default function AccountForm({ user, profile: initialProfile }: { user: User, profile: Profile | null }) {
  const supabase = createClient()
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [fullname, setFullname] = useState<string | null>(initialProfile?.full_name ?? null)
  const [username, setUsername] = useState<string | null>(initialProfile?.username ?? null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatar_url ?? null)
  
  const initials = getInitials(fullname, username, user?.email)

  async function updateProfile({
    username,
    fullname,
  }: {
    username: string | null
    fullname: string | null
  }) {
    try {
      setUpdating(true)

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullname,
        username,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      toast.success('Profile updated successfully!')
      router.refresh()
    } catch (error) {
      toast.error('Error updating the data!')
    } finally {
      setUpdating(false)
    }
  }

  const handleAvatarUpload = async (url: string, onUploadComplete: () => void) => {
    try {
        const { error } = await supabase.from('profiles').upsert({ id: user!.id, avatar_url: url })
        if (error) {
            toast.error('Failed to update avatar in profile.')
        } else {
            setAvatarUrl(url)
            toast.success('Avatar updated!')
            router.refresh()
        }
    } catch (error: any) {
        toast.error(`Error updating avatar: ${error.message}`)
    } finally {
        onUploadComplete()
    }
  }
  
  const handleAvatarDelete = async (onDeleteComplete: () => void) => {
    try {
        const { error } = await supabase.from('profiles').upsert({ id: user!.id, avatar_url: null })
        if (error) {
            toast.error('Failed to delete avatar from profile.')
        } else {
            setAvatarUrl(null)
            toast.success('Avatar deleted!')
            router.refresh()
        }
    } catch (error: any) {
        toast.error(`Error deleting avatar: ${error.message}`)
    } finally {
        onDeleteComplete()
    }
  }
  
  const formatRole = (role: string | undefined | null) => {
    if (!role) return 'N/A'
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">User Profile</CardTitle>
        <CardDescription>Manage your account settings and profile information.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 items-center">
            <AvatarUploader
                user={user}
                url={avatarUrl}
                initials={initials}
                onUpload={handleAvatarUpload}
                onDelete={handleAvatarDelete}
            />
        </div>

        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ''} disabled className="bg-muted/50"/>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" type="text" value={initialProfile?.job_title ?? 'N/A'} disabled className="bg-muted/50"/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" type="text" value={formatRole(initialProfile?.role)} disabled className="bg-muted/50"/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" type="text" value={initialProfile?.departments?.name ?? 'N/A'} disabled className="bg-muted/50"/>
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                    id="fullName"
                    type="text"
                    value={fullname || ''}
                    onChange={(e) => setFullname(e.target.value)}
                    disabled={updating}
                    placeholder="Your full name"
                    />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={updating}
                    placeholder="Your username"
                    />
            </div>
        </div>
      </CardContent>
       <CardFooter>
        <Button onClick={() => updateProfile({ fullname, username })} disabled={updating} className="w-full">
          {updating ? <Loader2 className="animate-spin"/> : 'Update Profile'}
        </Button>
      </CardFooter>
    </Card>
  )
}
