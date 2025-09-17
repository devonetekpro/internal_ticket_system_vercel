
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { CommentWithProfiles } from '../page'

type Result = {
  success: boolean;
  message: string;
  comment?: CommentWithProfiles;
}

const commentFormSchema = z.object({
  content: z.string().min(1),
  attachment: z
    .any()
    .optional()
    .nullable()
    .refine((file) => file === null || (file instanceof File && file.size > 0), {
        message: 'Attachment must be a file if provided.',
    })
    .refine((file) => !file || file.size <= 1 * 1024 * 1024, {
        message: 'Image must be less than 1MB.',
    })
    .refine((file) => !file || file.type.startsWith('image/'), {
        message: 'Only images are allowed.',
    }),
});

async function notifyMentionedUsers(ticketId: string, content: string, authorId: string) {
    const supabase = await createClient();
    const mentionRegex = /data-id="([^"]+)"/g;
    let match;
    const mentionedUsernames = new Set<string>();

    while ((match = mentionRegex.exec(content)) !== null) {
        mentionedUsernames.add(match[1]);
    }
    
    if (mentionedUsernames.size === 0) return;

    const { data: ticket } = await supabase.from('internal_tickets').select('title').eq('id', ticketId).single();
    if (!ticket) return;

    const { data: mentionedProfiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', Array.from(mentionedUsernames));

    if (!mentionedProfiles) return;
    
    const { data: authorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', authorId).single();
    const authorName = authorProfile?.full_name ?? authorProfile?.username ?? 'Someone';

    const notifications = mentionedProfiles
        .filter(p => p.id !== authorId) // Don't notify the author
        .map(profile => ({
            user_id: profile.id,
            ticket_id: ticketId,
            message: `<b>${authorName}</b> mentioned you in a comment on ticket: <b>${ticket.title}</b>`,
            notification_type: 'mention',
            actor_id: authorId,
        }));

    if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
    }
}

export async function createComment(
  ticketId: string,
  formData: FormData,
  parentId: string | null
): Promise<Result> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be logged in to comment.' }
  }

  const attachmentValue = formData.get('attachment');
  const rawFormData = {
    content: formData.get('content'),
    attachment: attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null,
  };

  const parsed = commentFormSchema.safeParse(rawFormData);
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(', ') };
  }

  const { content, attachment } = parsed.data;
  
  if (!content) {
    return { success: false, message: 'Comment cannot be empty.' }
  }

  try {
    let attachmentUrl: string | null = null;
    if (attachment && attachment.size > 0) {
      const fileExt = attachment.name.split('.').pop()
      const filePath = `${user.id}/comments/${ticketId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('ticket_attachments').upload(filePath, attachment)
      if (uploadError) throw new Error(`Attachment Upload Failed: ${uploadError.message}`)
      const { data: urlData } = supabase.storage.from('ticket_attachments').getPublicUrl(filePath)
      attachmentUrl = urlData.publicUrl
    }

    // 1. Insert the comment
    const { data: newComment, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
            internal_ticket_id: ticketId,
            user_id: user.id,
            content: content,
            parent_id: parentId,
            is_reply: !!parentId,
            attachment_url: attachmentUrl,
        })
        .select('*, profiles!ticket_comments_user_id_fkey (full_name, avatar_url, username), comment_views(*, profiles(full_name, username))')
        .single()


    if (commentError) {
      throw new Error(`Failed to post comment: ${commentError.message}`)
    }

    // 2. Handle mentions
    await notifyMentionedUsers(ticketId, content, user.id);

    revalidatePath(`/dashboard/tickets/${ticketId}`)
    revalidatePath(`/dashboard`)
    return { success: true, message: 'Comment posted successfully.', comment: newComment as CommentWithProfiles }
  } catch (error: any) {
    return { success: false, message: `Failed to post comment. ${error.message}` }
  }
}
