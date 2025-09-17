
-- This script is for seeding initial data. It's safe to run multiple times.
-- It deletes all existing permissions for the manageable roles and then re-inserts the defaults.

-- Define the roles that this script will manage.
DO $$
DECLARE
    managed_roles text[] := ARRAY['agent', 'user', 'manager', 'department_head', 'admin', 'ceo'];
BEGIN
    -- Clear previous permissions for managed roles to ensure a clean slate.
    DELETE FROM public.role_permissions WHERE role = ANY(managed_roles::public.user_role[]);
END
$$;

-- Insert default permissions for each role.
INSERT INTO public.role_permissions (role, permission, department_id)
VALUES
  -- System Admin (Has all permissions implicitly via helper function, no explicit records needed)

  -- CEO
  ('ceo', 'view_analytics', null),
  ('ceo', 'access_knowledge_base', null),
  ('ceo', 'create_tickets', null),
  ('ceo', 'view_all_tickets_in_department', null),
  ('ceo', 'change_ticket_status', null),
  ('ceo', 'delete_tickets', null),
  ('ceo', 'edit_ticket_properties', null),
  ('ceo', 'assign_tickets', null),
  ('ceo', 'manage_all_users', null),
  ('ceo', 'access_admin_panel', null),
  ('ceo', 'manage_departments', null),
  ('ceo', 'manage_templates', null),
  ('ceo', 'manage_knowledge_base', null),
  ('ceo', 'manage_sla_policies', null),
  ('ceo', 'manage_chat_settings', null),
  ('ceo', 'manage_roles', null),
  ('ceo', 'access_crm_tickets', null),
  ('ceo', 'access_live_chat', null),
  ('ceo', 'view_task_board', null),

  -- Admin
  ('admin', 'view_analytics', null),
  ('admin', 'access_knowledge_base', null),
  ('admin', 'create_tickets', null),
  ('admin', 'view_all_tickets_in_department', null),
  ('admin', 'change_ticket_status', null),
  ('admin', 'delete_tickets', null),
  ('admin', 'edit_ticket_properties', null),
  ('admin', 'assign_tickets', null),
  ('admin', 'manage_all_users', null),
  ('admin', 'access_admin_panel', null),
  ('admin', 'manage_departments', null),
  ('admin', 'manage_templates', null),
  ('admin', 'manage_knowledge_base', null),
  ('admin', 'manage_sla_policies', null),
  ('admin', 'manage_chat_settings', null),
  ('admin', 'access_crm_tickets', null),
  ('admin', 'access_live_chat', null),
  ('admin', 'view_task_board', null),

  -- Department Head
  ('department_head', 'view_analytics', null),
  ('department_head', 'create_tickets', null),
  ('department_head', 'view_all_tickets_in_department', null),
  ('department_head', 'change_ticket_status', null),
  ('department_head', 'edit_ticket_properties', null),
  ('department_head', 'assign_tickets', null),
  ('department_head', 'manage_users_in_department', null),
  ('department_head', 'access_live_chat', null),
  ('department_head', 'view_task_board', null),
  ('department_head', 'access_crm_tickets', (SELECT id from public.departments WHERE name = 'BackOffice')),

  -- Manager
  ('manager', 'create_tickets', null),
  ('manager', 'view_all_tickets_in_department', null),
  ('manager', 'change_ticket_status', null),
  ('manager', 'edit_ticket_properties', null),
  ('manager', 'assign_tickets', null),
  ('manager', 'view_task_board', null),

  -- Agent
  ('agent', 'create_tickets', null),
  ('agent', 'access_crm_tickets', null),
  ('agent', 'access_live_chat', null),
  ('agent', 'view_task_board', null),

  -- User
  ('user', 'create_tickets', null),
  ('user', 'view_task_board', null)

ON CONFLICT (role, permission, department_id) DO NOTHING;
