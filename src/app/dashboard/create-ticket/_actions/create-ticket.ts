

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { redirect } from 'next/navigation'


const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  departmentId: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assigned_to: z.string().min(1),
  tags: z.array(z.string()).optional(),
  collaborators: z.array(z.string()).optional(),
  attachment: z.any().optional().nullable(),
  is_external: z.boolean().optional(),
  crm_ticket_id: z.string().optional().nullable(),
})

type Result = {
  success: boolean
  message: string
  ticketId?: string
}

async function findDepartmentHead(departmentId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .rpc('get_least_busy_department_head', { dept_id: departmentId });

    if (error) {
        console.error("Error finding department head:", error);
        return null;
    }
    
    return data as string | null;
}

export async function createTicket(formData: FormData): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be logged in to create a ticket.' }
  }
  
  const { data: creatorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
  const creatorName = creatorProfile?.full_name ?? creatorProfile?.username ?? 'A user';

  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    departmentId: formData.get('departmentId'),
    category: formData.get('category'),
    priority: formData.get('priority'),
    assigned_to: formData.get('assigned_to'),
    tags: formData.getAll('tags[]'),
    attachment: formData.get('attachment'),
    collaborators: formData.getAll('collaborators[]'),
    is_external: formData.get('is_external') === 'true',
    crm_ticket_id: formData.get('crm_ticket_id'),
  }

  const parsed = formSchema.safeParse(rawFormData)

  if (!parsed.success) {
    return { success: false, message: `Invalid form data: ${parsed.error.message}` }
  }

  const { collaborators, departmentId, attachment, assigned_to, crm_ticket_id, ...ticketValues } = parsed.data

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
    if (assigned_to === 'auto-assign' && departmentId) {
        assignedToId = await findDepartmentHead(departmentId)
    }

    let slaPolicyId: string | null = null;
    if (departmentId) {
        const { data: slaPolicy } = await supabase
            .from('sla_policies')
            .select('id')
            .eq('priority', ticketValues.priority)
            .or(`department_id.eq.${departmentId},department_id.is.null`)
            .order('department_id', { nulls: 'last' })
            .limit(1)
            .single();
        slaPolicyId = slaPolicy?.id ?? null;
    }


    const ticketData = {
      ...ticketValues,
      created_by: user.id,
      assigned_to: assignedToId,
      attachment_url: attachmentUrl,
      sla_policy_id: slaPolicyId,
    }

    const { data: newTicket, error: insertError } = await supabase
      .from('internal_tickets')
      .insert(ticketData)
      .select('id, title')
      .single()

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      throw new Error(`Failed to create ticket: ${insertError.message}`)
    }
    
    const ticketId = newTicket.id
    const ticketTitle = newTicket.title;

    if (departmentId) {
        const { error: deptError } = await supabase.from('internal_ticket_departments').insert({
            internal_ticket_id: ticketId,
            department_id: departmentId,
        })
        if (deptError) {
            console.warn('Could not add ticket to department:', deptError.message)
        }
    }

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
    
    if (crm_ticket_id && ticketValues.is_external) {
      const { error: linkError } = await supabase.from('ticket_links').insert({
        internal_ticket_id: ticketId,
        crm_ticket_id,
      });
      if (linkError) {
        console.error("Failed to link CRM ticket:", linkError);
      }
    }

    revalidatePath('/dashboard/tickets')
    revalidatePath('/dashboard')
    return { success: true, message: 'Ticket created successfully!', ticketId }
  } catch (error: any) {
    return { success: false, message: `Failed to create ticket: ${error.message}` }
  }
}
