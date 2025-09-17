
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  departmentIds: z.array(z.string()).optional(),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assigned_to: z.string().min(1),
  tags: z.array(z.string()).optional(),
  collaborators: z.array(z.string()).optional(),
})

type Result = {
  success: boolean
  message: string
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

export async function updateTicket(ticketId: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "You must be logged in to update a ticket." }
  }

  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    departmentIds: formData.getAll('departmentIds[]'),
    category: formData.get('category'),
    priority: formData.get('priority'),
    assigned_to: formData.get('assigned_to'),
    tags: formData.getAll('tags[]'),
    collaborators: formData.getAll('collaborators[]'),
  }

  const parsed = formSchema.safeParse(rawFormData)

  if (!parsed.success) {
    return { success: false, message: `Invalid form data: ${parsed.error.message}` }
  }

  const { collaborators, departmentIds, assigned_to, ...ticketValues } = parsed.data

  try {
    let assignedToId = assigned_to === 'auto-assign' || !assigned_to ? null : assigned_to
    if (assigned_to === 'auto-assign' && departmentIds && departmentIds.length > 0) {
        assignedToId = await findDepartmentHead(departmentIds[0])
    }

    let slaPolicyId: string | null = null;
    if (departmentIds && departmentIds.length > 0) {
        // Find the matching SLA policy
        const { data: slaPolicy } = await supabase
            .from('sla_policies')
            .select('id')
            .eq('priority', ticketValues.priority)
            .or(`department_id.eq.${departmentIds[0]},department_id.is.null`)
            .order('department_id', { nulls: 'last' }) // Prioritize department-specific policies
            .limit(1)
            .single();
        slaPolicyId = slaPolicy?.id ?? null;
    }


    const ticketData = {
      ...ticketValues,
      assigned_to: assignedToId,
      updated_at: new Date().toISOString(),
      sla_policy_id: slaPolicyId,
    }

    // 1. Update the main ticket details. The trigger will handle assignment notifications.
    const { error: updateError } = await supabase.from('internal_tickets').update(ticketData).eq('id', ticketId)
    if (updateError) throw new Error(`Failed to update ticket: ${updateError.message}`)

    // 2. Handle department assignments
    const { data: existingDepartments } = await supabase.from('internal_ticket_departments').select('department_id').eq('internal_ticket_id', ticketId);
    const existingDeptIds = existingDepartments?.map(d => d.department_id) ?? [];
    const newDeptIds = departmentIds ?? [];

    const deptsToAdd = newDeptIds.filter(id => !existingDeptIds.includes(id)).map(id => ({ internal_ticket_id: ticketId, department_id: id }));
    const deptsToRemove = existingDeptIds.filter(id => !newDeptIds.includes(id));

    if (deptsToAdd.length > 0) {
        await supabase.from('internal_ticket_departments').insert(deptsToAdd);
    }
    if (deptsToRemove.length > 0) {
        await supabase.from('internal_ticket_departments').delete().eq('internal_ticket_id', ticketId).in('department_id', deptsToRemove);
    }

    // 3. Handle collaborators. The trigger will handle notifications.
    const { data: existingCollaborators } = await supabase.from('internal_ticket_collaborators').select('user_id').eq('internal_ticket_id', ticketId);
    const existingCollabIds = existingCollaborators?.map(c => c.user_id) ?? [];
    const newCollabIds = collaborators ?? [];

    const collabsToAdd = newCollabIds.filter(id => !existingCollabIds.includes(id));
    const collabsToRemove = existingCollabIds.filter(id => !newCollabIds.includes(id));

    if (collabsToAdd.length > 0) {
        const recordsToAdd = collabsToAdd.map(userId => ({
            internal_ticket_id: ticketId,
            user_id: userId,
        }));
        await supabase.from('internal_ticket_collaborators').insert(recordsToAdd);
    }
    if (collabsToRemove.length > 0) {
        await supabase.from('internal_ticket_collaborators').delete().eq('internal_ticket_id', ticketId).in('user_id', collabsToRemove);
    }

    revalidatePath(`/dashboard/tickets/${ticketId}`)
    revalidatePath('/dashboard/tickets')
    revalidatePath('/dashboard')
    
  } catch (error: any) {
    return { success: false, message: error.message }
  }

  redirect(`/dashboard/tickets/${ticketId}`)
}
