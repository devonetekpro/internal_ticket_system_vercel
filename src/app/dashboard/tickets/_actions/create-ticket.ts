
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { redirect } from 'next/navigation'


const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  departmentIds: z.array(z.string()).min(1),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assigned_to: z.string().min(1),
  tags: z.array(z.string()).optional(),
  collaborators: z.array(z.string()).optional(),
  attachment: z.any().optional().nullable(),
  is_external: z.boolean().optional(),
})

type Result = {
  success: boolean
  message: string
  ticketId?: string
}

async function findDepartmentHead(departmentId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('department_id', departmentId)
        .eq('role', 'department_head')
        .limit(1)
        .single()

    if (error) {
        console.error("Error finding department head:", error)
        return null
    }

    return data?.id ?? null
}

export async function createTicket(formData: FormData): Promise<Result> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be logged in to create a ticket.' }
  }
  
  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    departmentIds: formData.getAll('departmentIds[]'),
    category: formData.get('category'),
    priority: formData.get('priority'),
    assigned_to: formData.get('assigned_to'),
    tags: formData.getAll('tags[]'),
    attachment: formData.get('attachment'),
    collaborators: formData.getAll('collaborators[]'),
    is_external: formData.get('is_external') === 'true'
  }

  const parsed = formSchema.safeParse(rawFormData)

  if (!parsed.success) {
    return { success: false, message: `Invalid form data: ${parsed.error.message}` }
  }

  const { collaborators, departmentIds, attachment, assigned_to, ...ticketValues } = parsed.data

  try {
    let attachmentUrl: string | null = null;
    if (attachment && attachment.size > 0) {
      const fileExt = attachment.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('ticket_attachments').upload(filePath, attachment)
      if (uploadError) throw new Error(`Attachment Upload Failed: ${uploadError.message}`)
      const { data: urlData } = supabase.storage.from('ticket_attachments').getPublicUrl(filePath)
      attachmentUrl = urlData.publicUrl
    }
    
    let assignedToId = assigned_to === 'auto-assign' || !assigned_to ? null : assigned_to;
    if (assigned_to === 'auto-assign' && departmentIds.length > 0) {
        // For auto-assign, we'll pick the head of the first selected department
        assignedToId = await findDepartmentHead(departmentIds[0])
    }

    const ticketData = {
      ...ticketValues,
      created_by: user.id,
      assigned_to: assignedToId,
      attachment_url: attachmentUrl,
    }

    // 1. Insert the ticket. The trigger will handle the assignment notification.
    const { data: newTicket, error: insertError } = await supabase
      .from('internal_tickets')
      .insert(ticketData)
      .select('id')
      .single()

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      throw new Error(`Failed to create ticket: ${insertError.message}`)
    }
    
    const ticketId = newTicket.id

    // 2. Insert into the ticket_departments join table
    if (departmentIds && departmentIds.length > 0) {
        const departmentRecords = departmentIds.map(deptId => ({
            internal_ticket_id: ticketId,
            department_id: deptId,
        }))
        const { error: deptError } = await supabase.from('internal_ticket_departments').insert(departmentRecords)
        if (deptError) {
            console.warn('Could not add ticket to departments:', deptError.message)
        }
    }

    // 3. Handle collaborators. The trigger will handle notifications.
    if (collaborators && collaborators.length > 0) {
        const collaboratorRecords = collaborators.map(userId => ({
            internal_ticket_id: ticketId,
            user_id: userId,
        }))
        const { error: collabError } = await supabase.from('internal_ticket_collaborators').insert(collaboratorRecords)
        if (collabError) {
            console.warn('Could not add collaborators:', collabError.message)
        }
    }

    revalidatePath('/dashboard/tickets')
    revalidatePath('/dashboard')
    return { success: true, message: 'Ticket created successfully!', ticketId }
  } catch (error: any) {
    return { success: false, message: `Failed to create ticket: ${error.message}` }
  }
}
