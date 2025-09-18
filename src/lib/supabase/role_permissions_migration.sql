-- This script seeds the role_permissions table with default permissions for each role.
-- It's designed to be idempotent, meaning it can be run multiple times without causing errors.
-- It works by clearing existing permissions and then inserting the corrected, full set.

-- Clear existing permissions to ensure a clean slate
TRUNCATE public.role_permissions RESTART IDENTITY;

-- Insert the default permissions for all roles
INSERT INTO public.role_permissions (role, permission, department_id) VALUES
-- System Admin (has all permissions, so we can be explicit or rely on app logic)
-- For clarity, we will grant all permissions explicitly.
('system_admin', 'view_analytics', null),
('system_admin', 'access_knowledge_base', null),
('system_admin', 'create_tickets', null),
('system_admin', 'view_all_tickets_in_department', null),
('system_admin', 'change_ticket_status', null),
('system_admin', 'delete_tickets', null),
('system_admin', 'edit_ticket_properties', null),
('system_admin', 'assign_tickets', null),
('system_admin', 'manage_all_users', null),
('system_admin', 'manage_users_in_department', null),
('system_admin', 'access_admin_panel', null),
('system_admin', 'manage_departments', null),
('system_admin', 'manage_templates', null),
('system_admin', 'manage_knowledge_base', null),
('system_admin', 'manage_sla_policies', null),
('system_admin', 'manage_chat_settings', null),
('system_admin', 'manage_roles', null),
('system_admin', 'access_crm_tickets', null),
('system_admin', 'access_live_chat', null),
('system_admin', 'view_task_board', null),
('system_admin', 'delete_users', null),

-- Super Admin (has all permissions, similar to system_admin)
('super_admin', 'view_analytics', null),
('super_admin', 'access_knowledge_base', null),
('super_admin', 'create_tickets', null),
('super_admin', 'view_all_tickets_in_department', null),
('super_admin', 'change_ticket_status', null),
('super_admin', 'delete_tickets', null),
('super_admin', 'edit_ticket_properties', null),
('super_admin', 'assign_tickets', null),
('super_admin', 'manage_all_users', null),
('super_admin', 'manage_users_in_department', null),
('super_admin', 'access_admin_panel', null),
('super_admin', 'manage_departments', null),
('super_admin', 'manage_templates', null),
('super_admin', 'manage_knowledge_base', null),
('super_admin', 'manage_sla_policies', null),
('super_admin', 'manage_chat_settings', null),
('super_admin', 'manage_roles', null),
('super_admin', 'access_crm_tickets', null),
('super_admin', 'access_live_chat', null),
('super_admin', 'view_task_board', null),
('super_admin', 'delete_users', null),

-- CEO (High-level access, can see everything but maybe not manage system settings)
('ceo', 'view_analytics', null),
('ceo', 'access_knowledge_base', null),
('ceo', 'create_tickets', null),
('ceo', 'view_all_tickets_in_department', null),
('ceo', 'change_ticket_status', null),
('ceo', 'assign_tickets', null),
('ceo', 'manage_all_users', null),
('ceo', 'access_admin_panel', null),
('ceo', 'access_crm_tickets', null),
('ceo', 'access_live_chat', null),
('ceo', 'view_task_board', null),
('ceo', 'delete_users', null),


-- Admin (Slightly less than System Admin, maybe no role management)
('admin', 'view_analytics', null),
('admin', 'access_knowledge_base', null),
('admin', 'create_tickets', null),
('admin', 'view_all_tickets_in_department', null),
('admin', 'change_ticket_status', null),
('admin', 'delete_tickets', null),
('admin', 'edit_ticket_properties', null),
('admin', 'assign_tickets', null),
('admin', 'manage_all_users', null),
('admin', 'manage_users_in_department', null),
('admin', 'access_admin_panel', null),
('admin', 'manage_departments', null),
('admin', 'manage_templates', null),
('admin', 'manage_knowledge_base', null),
('admin', 'manage_sla_policies', null),
('admin', 'manage_chat_settings', null),
('admin', 'access_crm_tickets', null),
('admin', 'access_live_chat', null),
('admin', 'view_task_board', null),


-- Department Head (Manages their own department)
('department_head', 'view_analytics', null),
('department_head', 'access_knowledge_base', null),
('department_head', 'create_tickets', null),
('department_head', 'view_all_tickets_in_department', null),
('department_head', 'change_ticket_status', null),
('department_head', 'edit_ticket_properties', null),
('department_head', 'assign_tickets', null),
('department_head', 'manage_users_in_department', null),
('department_head', 'access_crm_tickets', null),
('department_head', 'view_task_board', null),


-- Agent (Standard user, can handle tickets)
('agent', 'access_knowledge_base', null),
('agent', 'create_tickets', null),
('agent', 'change_ticket_status', null),
('agent', 'edit_ticket_properties', null),
('agent', 'access_crm_tickets', null),
('agent', 'access_live_chat', null),
('agent', 'view_task_board', null),


-- User (Basic, can only create and view their own tickets)
('user', 'access_knowledge_base', null),
('user', 'create_tickets', null)

ON CONFLICT DO NOTHING;
