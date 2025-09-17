
'use server';

import { createClient } from '@/lib/supabase/server';

export async function markCommentsAsRead(commentIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || commentIds.length === 0) {
        return;
    }

    const recordsToUpsert = commentIds.map(commentId => ({
        comment_id: commentId,
        user_id: user.id,
    }));

    // Use upsert to avoid errors if the user has already viewed the comment.
    // The 'onConflict' option makes it ignore duplicates based on the primary key (comment_id, user_id).
    const { error } = await supabase
        .from('comment_views')
        .upsert(recordsToUpsert, { onConflict: 'comment_id,user_id', ignoreDuplicates: true });

    if (error) {
        console.error('Error marking comments as read:', error);
    }
}
