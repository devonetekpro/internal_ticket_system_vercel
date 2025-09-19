
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, UploadCloud, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import type { User } from '@supabase/supabase-js'

interface AvatarUploaderProps {
  user: User | null
  url: string | null
  initials: string
  onUpload: (url: string, onUploadComplete: () => void) => void
  onDelete: (onDeleteComplete: () => void) => void
}

export function AvatarUploader({ user, url, initials, onUpload, onDelete }: AvatarUploaderProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewUrl(url)
  }, [url])
  
  useEffect(() => {
    if (file) {
      uploadAvatar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 1 * 1024 * 1024) { // 1MB limit
        toast.error("Image size cannot exceed 1MB.")
        return
      }
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile)
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        toast.error('Only image files are accepted.')
      }
    }
  }

  const uploadAvatar = async () => {
    if (!file || !user?.id) {
      toast.error('You must select an image to upload.')
      return
    }

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      if (data) {
        onUpload(data.publicUrl, () => {
          setUploading(false)
          setFile(null)
        })
      } else {
        throw new Error('Could not get public URL for avatar.')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to upload avatar: ${error.message}`)
      } else {
        toast.error('An unknown error occurred during upload.')
      }
      setUploading(false)
    }
  }
  
  const deleteAvatar = async () => {
    if (!url) return
    
    setDeleting(true)
    try {
        const path = new URL(url).pathname.split('/').pop()
        if (path) {
            await supabase.storage.from('avatars').remove([path])
        }
        onDelete(() => {
            setDeleting(false)
            setPreviewUrl(null)
        })
    } catch (error: any) {
        toast.error('Failed to delete avatar.')
        setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-center flex-wrap gap-6">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            disabled={uploading || deleting}
        />
        <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20">
                <AvatarImage className='object-cover' src={previewUrl ?? undefined} alt="User avatar" />
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
             {(uploading || deleting) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}
        </div>
        <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || deleting}>
                <UploadCloud className="mr-2 h-4 w-4" /> Change Picture
            </Button>
            {url && (
                <Button variant="destructive" onClick={deleteAvatar} disabled={uploading || deleting}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Picture
                </Button>
            )}
        </div>
    </div>
  )
}
