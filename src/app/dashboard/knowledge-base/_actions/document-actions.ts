
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/database.types';
import { checkPermission } from '@/lib/helpers/permissions';

type KnowledgeBaseDocument = Database['public']['Tables']['knowledge_base_documents']['Row'];

export async function getDocuments(): Promise<KnowledgeBaseDocument[]> {
    const canAccess = await checkPermission('access_knowledge_base');
    if (!canAccess) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('knowledge_base_documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching documents:', error);
        return [];
    }
    return data;
}

export async function uploadDocument(formData: FormData) {
    const canManage = await checkPermission('manage_knowledge_base');
    if (!canManage) {
        return { success: false, message: 'You do not have permission to upload documents.' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Not authenticated' };
    }

    const file = formData.get('document') as File | null;
    if (!file) {
        return { success: false, message: 'No file provided.' };
    }
    
    if (file.type !== 'text/plain' && file.type !== 'application/pdf') {
        return { success: false, message: 'Invalid file type. Only TXT and PDF files are supported.' };
    }
    
    let content = '';
    try {
        content = await file.text();
        if (!content.trim()) {
            return { success: false, message: "Document content is empty." };
        }
    } catch (err) {
        console.error('Error reading file:', err);
        return { success: false, message: 'Failed to read file content.' };
    }
    
    try {
        // 1. Insert the document metadata first. The trigger will handle the rest.
        const { data: newDocument, error: docError } = await supabase
            .from('knowledge_base_documents')
            .insert({
                file_name: file.name,
                content: content,
                created_by: user.id,
            })
            .select()
            .single();

        if (docError) {
            throw new Error(`Database error creating document entry: ${docError.message}`);
        }

        revalidatePath('/dashboard/knowledge-base');
        return { success: true, message: 'Document uploaded. Processing in the background.', document: newDocument };

    } catch (e: any) {
        console.error("Error during document upload:", e);
        return { success: false, message: `An error occurred: ${e.message}` };
    }
}


export async function deleteDocument(id: string) {
    const canManage = await checkPermission('manage_knowledge_base');
    if (!canManage) {
        return { success: false, message: 'You do not have permission to delete documents.' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('knowledge_base_documents')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting document:', error);
        return { success: false, message: `Database error: ${error.message}` };
    }
    
    revalidatePath('/dashboard/knowledge-base');
    return { success: true, message: 'Document deleted successfully.' };
}
