
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountForm from '@/components/account-form'
import CommentTemplateManager from './_components/comment-template-manager'
import { getCommentTemplates } from './_actions/comment-template-actions'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row'] & { departments: { name: string } | null };

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    profileResult,
    commentTemplates,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(`*, departments ( name )`)
      .eq('id', user.id)
      .single<Profile>(),
    getCommentTemplates()
  ]);

  const { data: profile } = profileResult;
  
  if (!profile) {
    // This case should ideally not happen for an authenticated user
    // but it's good practice to handle it.
    console.error("Authenticated user has no profile. Redirecting to login.");
    redirect('/login?message=User profile not found. Please log in again.');
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 flex flex-col gap-8">
            <AccountForm user={user} profile={profile} />
        </div>
        <div className="lg:col-span-2">
            <CommentTemplateManager initialTemplates={commentTemplates} />
        </div>
      </div>
    </main>
  )
}
