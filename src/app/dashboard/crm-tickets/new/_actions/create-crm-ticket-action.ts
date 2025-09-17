

'use server';

import { createCrmTicket } from '@/services/crm-service';
import { z } from 'zod';

const formSchema = z.object({
  user: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number()
  ),
  manager: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number()
  ),
  title: z.string(),
  text: z.string(),
  category: z.string(),
  attachmentName: z.string().optional(),
  attachmentFile: z.string().optional(), // base64 encoded
});

export async function createCrmTicketAction(formData: FormData) {
    const rawData = {
        user: formData.get('user'),
        manager: formData.get('manager'),
        title: formData.get('title'),
        text: formData.get('text'),
        category: formData.get('category'),
        attachmentName: formData.get('attachmentName'),
        attachmentFile: formData.get('attachmentFile'),
    };

    const parsed = formSchema.safeParse(rawData);

    if (!parsed.success) {
        return { success: false, message: `Invalid form data: ${parsed.error.message}` };
    }

    try {
        const result = await createCrmTicket(parsed.data);
        return { success: true, message: 'Ticket created!', ticketId: result.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

