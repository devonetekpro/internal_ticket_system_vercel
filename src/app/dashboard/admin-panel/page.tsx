
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import DepartmentManager from './_components/department-manager';
import TemplateManager from './_components/template-manager';
import type { Department } from '@/lib/database.types';
import { getTemplates } from './_actions/template-actions';
import PrefilledQuestionManager from './_components/prefilled-question-manager';
import { getPrefilledQuestions } from './_actions/prefilled-question-actions';
import SlaPolicyManager from './_components/sla-policy-manager';
import { getSlaPolicies } from './_actions/sla-policy-actions';
import { checkPermission } from '@/lib/helpers/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminPanelPage() {
  const canAccess = await checkPermission('access_admin_panel');
  if (!canAccess) {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  const [
    departmentsResult,
    templates,
    prefilledQuestions,
    slaPolicies,
    canManageSla,
    canManageDepartments,
    canManageTemplates,
    canManageChat
  ] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    getTemplates(),
    getPrefilledQuestions(),
    getSlaPolicies(),
    checkPermission('manage_sla_policies'),
    checkPermission('manage_departments'),
    checkPermission('manage_templates'),
    checkPermission('manage_chat_settings')
  ]);

  const { data: departments, error } = departmentsResult;
  if (error) {
    console.error('Error fetching departments:', error);
  }

  return (
    <main className="flex-1 flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" /> Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage system-wide settings and configurations.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {canManageSla && <SlaPolicyManager initialPolicies={slaPolicies as any} departments={departments ?? []} />}
        {canManageDepartments && <DepartmentManager departments={departments ?? []} />}
        {canManageTemplates && <TemplateManager initialTemplates={templates as any} departments={departments ?? []} />}
        {canManageChat && <PrefilledQuestionManager initialQuestions={prefilledQuestions} />}
      </div>
    </main>
  );
}
