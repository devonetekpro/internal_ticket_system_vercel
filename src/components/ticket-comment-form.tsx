

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Loader2, X, Paperclip, UploadCloud, Trash2, FileText, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User } from '@supabase/supabase-js'
import { getInitials } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { CommentWithProfiles } from '@/app/dashboard/tickets/[id]/page'
import { createComment } from '@/app/dashboard/tickets/[id]/_actions/create-comment'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import TextEditor from './text-editor'
import { format } from 'date-fns'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { TemplateSelectionModal } from './template-selection-modal'

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

interface TicketCommentFormProps {
  ticketId: string
  currentUser: User
  mentionableUsers: Profile[]
  replyingTo: CommentWithProfiles | null
  onCancelReply: () => void
  onCommentPosted: (newComment: CommentWithProfiles) => void
}

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  attachment: z.instanceof(File).optional().nullable(),
})

const stripHtml = (html: string) => {
    if (typeof DOMParser === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('blockquote').forEach(bq => bq.remove());
    // Get text content and trim it
    return doc.body.textContent?.trim() || "";
}

export default function TicketCommentForm({
  ticketId,
  currentUser,
  mentionableUsers,
  replyingTo,
  onCancelReply,
  onCommentPosted,
}: TicketCommentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
    setValue,
    watch,
    getValues,
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '', attachment: null },
    mode: 'onChange'
  })

  useEffect(() => {
    if (replyingTo) {
      const originalContent = replyingTo.content;
      const authorName = replyingTo.profiles?.full_name ?? replyingTo.profiles?.username ?? 'System';
      const authorUsername = replyingTo.profiles?.username ?? 'system';
      const createdAt = format(new Date(replyingTo.created_at), "dd/MM/yyyy h:mm a");

      // Use a DOM parser to safely strip HTML and blockquotes
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalContent, 'text/html');
      doc.querySelectorAll('blockquote').forEach(bq => bq.remove());
      const strippedContent = doc.body.innerHTML;

      const newContent = `<blockquote><p><strong>${authorName}</strong> <time>${createdAt}</time></p>${strippedContent}</blockquote><p><span data-type="mention" data-id="${authorUsername}" data-label="${authorName}">@${authorName}</span> </p>`;
      
      setValue('content', newContent, { shouldDirty: true });
    }
  }, [replyingTo, setValue]);


  const attachmentFile = watch('attachment');
  const contentValue = watch('content');
  
  const handleCancelReply = () => {
    reset({ content: '', attachment: null });
    onCancelReply();
  }
  
  const onSubmit = async (data: z.infer<typeof commentSchema>) => {
    setLoading(true)
    
    const formData = new FormData()
    formData.append('content', data.content)
    if (data.attachment) {
      formData.append('attachment', data.attachment)
    }

    const currentReplyingTo = replyingTo;

    const result = await createComment(ticketId, formData, currentReplyingTo?.id ?? null)

    if (result.success && result.comment) {
      toast.success(currentReplyingTo ? 'Reply posted!' : 'Comment posted!')
      // Do not call onCommentPosted here, as it will be handled by the realtime subscription
      reset({ content: '', attachment: null })
      handleCancelReply()
      removeFile()
    } else {
      toast.error(result.message)
    }

    setLoading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (selectedFile.size > 1 * 1024 * 1024) { // 1MB limit
        toast.error("Image size cannot exceed 1MB.")
        return
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.error("Only image files are allowed.")
        return
      }
      setValue('attachment', selectedFile, { shouldDirty: true, shouldValidate: true })
      setFile(selectedFile);
    }
  }

  const removeFile = () => {
    setFile(null);
    setValue('attachment', null, { shouldDirty: true, shouldValidate: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTemplateSelect = (content: string) => {
    setValue('content', getValues('content') + content, { shouldDirty: true });
    setIsTemplateModalOpen(false);
  }
  
  const isContentEmpty = !contentValue || stripHtml(contentValue) === '';
  
  const isSubmitDisabled = loading || (isContentEmpty && !attachmentFile)

  return (
    <div className="flex items-start gap-4">
      <Avatar>
        <AvatarImage src={currentUser.user_metadata.avatar_url} />
        <AvatarFallback>{getInitials(currentUser.user_metadata.full_name, currentUser.email)}</AvatarFallback>
      </Avatar>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
         {replyingTo && (
            <Card className="mb-4 bg-muted/50">
              <CardContent className="p-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-muted-foreground flex-1 overflow-hidden">
                    Replying to <strong className="text-foreground">{replyingTo.profiles?.full_name ?? 'System'}</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={handleCancelReply}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
        )}
        <div className="rounded-lg border">
            <Controller
                name="content"
                control={control}
                render={({ field }) => (
                    <TextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Add a comment..."
                        mentionableUsers={mentionableUsers}
                    />
                )}
            />
             <div className="p-2 border-t border-input">
                {file ? (
                    <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/50">
                        <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {file.type} ({(file.size / 1024).toFixed(2)} KB)
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeFile}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="comment-attachment-input" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                <UploadCloud className="w-6 h-6 mb-2 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            </div>
                            <Input id="comment-attachment-input" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
                        </label>
                    </div> 
                )}
             </div>
        </div>
        <div className="flex justify-between items-center mt-4">
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" type="button">
                        <FileText className="mr-2 h-4 w-4" /> Use Template
                    </Button>
                </DialogTrigger>
                <TemplateSelectionModal onTemplateSelect={handleTemplateSelect} />
            </Dialog>
            <Button type="submit" disabled={isSubmitDisabled}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {replyingTo ? 'Post Reply' : 'Post Comment'}
            </Button>
        </div>
      </form>
    </div>
  )
}
