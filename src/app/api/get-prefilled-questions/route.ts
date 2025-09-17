
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This route can be called by the public chat widget, so it does not require authentication.
// RLS policies on the table ensure it's read-only for public users.
export async function GET() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('prefilled_questions')
            .select('id, question')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching prefilled questions:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: `Unexpected error: ${e.message}` }, { status: 500 });
    }
}
