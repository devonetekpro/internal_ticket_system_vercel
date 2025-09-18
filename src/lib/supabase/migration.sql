-- Create vector extension
create extension if not exists vector;
-- Create user_role enum
create type user_role as enum (
  'system_admin',
  'super_admin',
  'admin',
  'ceo',
  'department_head',
  'agent',
  'user'
);
-- Create ticket_status enum
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
-- Create ticket_priority enum
create type ticket_priority as enum ('low', 'medium', 'high', 'critical');
-- Create permission_key enum for granular permissions
create type permission_key as enum (
  'view_analytics',
  'access_knowledge_base',
  'create_tickets',
  'view_all_tickets_in_department',
  'change_ticket_status',
  'delete_tickets',
  'edit_ticket_properties',
  'assign_tickets',
  'manage_all_users',
  'manage_users_in_department',
  'access_admin_panel',
  'manage_departments',
  'manage_templates',
  'manage_knowledge_base',
  'manage_sla_policies',
  'manage_chat_settings',
  'manage_roles',
  'access_crm_tickets',
  'access_live_chat',
  'view_task_board',
  'delete_users'
);

-- Create departments table
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
-- Create profiles table
create table profiles (
  id uuid not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  email text,
  job_title text,
  role user_role default 'user',
  department_id uuid references departments (id) on delete
  set
    null,
    crm_manager_id int unique,
    deleted_at timestamp with time zone,
    constraint username_length check (
      char_length(username) >= 3
    )
);
alter table profiles enable row level security;
alter table profiles add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;

-- Create crm_tickets table to cache data from external API
create table crm_tickets (
    id uuid primary key default gen_random_uuid(),
    crm_id text not null unique,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    title text not null,
    description text not null,
    status text not null,
    priority text not null default 'medium',
    category text,
    client_id text,
    created_by text,
    assigned_to text
);
alter table crm_tickets enable row level security;

-- Create role_permissions table
create table role_permissions (
    id bigint primary key generated always as identity,
    created_at timestamp with time zone default now() not null,
    role user_role not null,
    permission permission_key not null,
    department_id uuid references departments (id) on delete cascade,
    unique (role, permission, department_id)
);
alter table role_permissions enable row level security;

-- Create sla_policies table
create table sla_policies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    priority ticket_priority not null,
    department_id uuid references departments(id) on delete cascade,
    response_time_minutes integer not null,
    resolution_time_minutes integer not null,
    is_active boolean not null default true,
    created_at timestamp with time zone default now() not null,
    unique (priority, department_id)
);
alter table sla_policies enable row level security;

-- Create internal_tickets table
create table internal_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  title text not null,
  description text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  category text,
  tags text [],
  attachment_url text,
  created_by uuid not null,
  assigned_to uuid,
  is_external boolean not null default false,
  sla_policy_id uuid references sla_policies(id) on delete set null
);
alter table internal_tickets enable row level security;

-- Add foreign key constraints to internal_tickets
ALTER TABLE public.internal_tickets DROP CONSTRAINT IF EXISTS internal_tickets_created_by_fkey;
ALTER TABLE public.internal_tickets 
ADD CONSTRAINT internal_tickets_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.internal_tickets DROP CONSTRAINT IF EXISTS internal_tickets_assigned_to_fkey;
ALTER TABLE public.internal_tickets 
ADD CONSTRAINT internal_tickets_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create internal_ticket_departments join table
create table internal_ticket_departments (
  internal_ticket_id uuid not null references internal_tickets (id) on delete cascade,
  department_id uuid not null references departments (id) on delete cascade,
  primary key (internal_ticket_id, department_id)
);
alter table internal_ticket_departments enable row level security;
-- Create internal_ticket_collaborators join table
create table internal_ticket_collaborators (
  internal_ticket_id uuid not null references internal_tickets (id) on delete cascade,
  user_id uuid not null,
  primary key (internal_ticket_id, user_id)
);
alter table internal_ticket_collaborators enable row level security;

-- Add foreign key constraint to internal_ticket_collaborators
ALTER TABLE public.internal_ticket_collaborators DROP CONSTRAINT IF EXISTS internal_ticket_collaborators_user_id_fkey;
ALTER TABLE public.internal_ticket_collaborators 
ADD CONSTRAINT internal_ticket_collaborators_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create ticket_links join table
create table ticket_links (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default now() not null,
  internal_ticket_id uuid not null references internal_tickets (id) on delete cascade,
  crm_ticket_id text not null references crm_tickets (crm_id) on delete cascade,
  unique (internal_ticket_id, crm_ticket_id)
);
alter table ticket_links enable row level security;
-- Create ticket_comments table
create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  internal_ticket_id uuid references internal_tickets (id) on delete cascade,
  crm_ticket_id text references crm_tickets (crm_id) on delete cascade,
  user_id uuid not null,
  content text not null,
  parent_id uuid references ticket_comments (id) on delete cascade,
  is_reply boolean default false,
  attachment_url text
);
alter table ticket_comments enable row level security;

-- Add foreign key constraint to ticket_comments
ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;
ALTER TABLE public.ticket_comments 
ADD CONSTRAINT ticket_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create comment_views table
create table comment_views (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references ticket_comments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  viewed_at timestamp with time zone not null default now(),
  unique (comment_id, user_id)
);
alter table comment_views enable row level security;
-- Create ticket_history table
create table ticket_history (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default now() not null,
  ticket_id uuid not null,
  user_id uuid not null,
  event_type text not null,
  details jsonb
);
alter table ticket_history enable row level security;

-- Add foreign key constraint to ticket_history
ALTER TABLE public.ticket_history DROP CONSTRAINT IF EXISTS ticket_history_user_id_fkey;
ALTER TABLE public.ticket_history 
ADD CONSTRAINT ticket_history_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create notifications table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references profiles (id) on delete cascade,
  ticket_id uuid references internal_tickets (id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  notification_type text,
  actor_id uuid
);
alter table notifications enable row level security;

-- Add foreign key constraint to notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create ticket_templates table
create table ticket_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department_id uuid not null references departments (id) on delete cascade,
  priority ticket_priority not null default 'medium',
  category text
);
alter table ticket_templates enable row level security;

-- Create knowledge_base_documents table
create table knowledge_base_documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  content text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid
);
alter table knowledge_base_documents enable row level security;

-- Add foreign key constraint to knowledge_base_documents
ALTER TABLE public.knowledge_base_documents DROP CONSTRAINT IF EXISTS knowledge_base_documents_created_by_fkey;
ALTER TABLE public.knowledge_base_documents 
ADD CONSTRAINT knowledge_base_documents_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create document_chunks table
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references knowledge_base_documents (id) on delete cascade,
  content text,
  embedding vector(768), -- Corresponds to the embedding model dimensions
  created_at timestamp with time zone default now()
);
alter table document_chunks enable row level security;

-- Create prefilled_questions table for chat widget
create table prefilled_questions (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    created_at timestamp with time zone not null default now(),
    created_by uuid
);
alter table prefilled_questions enable row level security;

-- Add foreign key constraint to prefilled_questions
ALTER TABLE public.prefilled_questions DROP CONSTRAINT IF EXISTS prefilled_questions_created_by_fkey;
ALTER TABLE public.prefilled_questions 
ADD CONSTRAINT prefilled_questions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create comment_templates table
create table comment_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles (id) on delete cascade,
    title text not null,
    content text not null,
    created_at timestamp with time zone not null default now()
);
alter table comment_templates enable row level security;

-- Create task_columns table
create table task_columns (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    position int not null,
    created_at timestamp with time zone not null default now()
);
alter table task_columns enable row level security;

-- Create tasks table
create table tasks (
    id uuid primary key default gen_random_uuid(),
    column_id uuid not null references task_columns(id) on delete cascade,
    internal_ticket_id uuid references internal_tickets(id) on delete cascade,
    content text,
    position int not null,
    created_at timestamp with time zone not null default now(),
    unique(internal_ticket_id)
);
alter table tasks enable row level security;


-- Create chats table
create table chats (
    id uuid primary key default gen_random_uuid(),
    client_id text not null,
    assigned_agent_id uuid,
    status text not null default 'active',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    linked_ticket_id uuid references internal_tickets(id) on delete set null,
    client_name text,
    client_email text
);
alter table chats enable row level security;

-- Add foreign key constraint to chats
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_assigned_agent_id_fkey;
ALTER TABLE public.chats 
ADD CONSTRAINT chats_assigned_agent_id_fkey 
FOREIGN KEY (assigned_agent_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;


-- Create chat_messages table
create table chat_messages (
    id uuid primary key default gen_random_uuid(),
    chat_id uuid not null references chats(id) on delete cascade,
    sender_type text not null, -- 'client', 'ai', 'agent'
    content text not null,
    created_at timestamp with time zone not null default now()
);
alter table chat_messages enable row level security;


-- Set up Row Level Security
-- PROFILES
create policy "Public profiles are viewable by everyone." on profiles for
select using (true);
create policy "Users can insert their own profile." on profiles for
insert with check (auth.uid() = id);
create policy "Users can update their own profile." on profiles for
update using (auth.uid() = id);
create policy "Admins can update any profile." on profiles for
update using (
    (
      select role
      from profiles
      where id = auth.uid()
    ) in ('system_admin', 'super_admin', 'admin', 'ceo')
  );

-- DEPARTMENTS
create policy "Departments are viewable by all authenticated users." on departments for
select using (auth.role() = 'authenticated');
create policy "Admins can manage departments." on departments for all using (
  (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin')
);

-- INTERNAL TICKETS
create policy "Users can view tickets they created, are assigned to, or are collaborating on." on internal_tickets for
select using (
    auth.uid() = created_by 
    or auth.uid() = assigned_to 
    or id in (
      select internal_ticket_id from internal_ticket_collaborators where user_id = auth.uid()
    )
  );
create policy "Department members can view tickets in their department." on internal_tickets for
select using (
    id in (
      select internal_ticket_id from internal_ticket_departments where department_id = (
        select department_id from profiles where id = auth.uid()
      )
    )
  );
create policy "Admins can view all tickets." on internal_tickets for
select using (
    (
      select role
      from profiles
      where id = auth.uid()
    ) in ('system_admin', 'super_admin', 'admin', 'ceo', 'department_head')
  );
create policy "Authenticated users can create tickets." on internal_tickets for
insert with check (auth.role() = 'authenticated');
create policy "Users can update tickets they are assigned to." on internal_tickets for
update using (auth.uid() = assigned_to);
create policy "Admins can update all tickets." on internal_tickets for
update using (
    (
      select role
      from profiles
      where id = auth.uid()
    ) in ('system_admin', 'super_admin', 'admin', 'ceo', 'department_head')
  );
create policy "Ticket creator and admins can delete tickets." on internal_tickets for delete using (
  auth.uid() = created_by
  or (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin', 'admin', 'ceo')
);


-- TICKET DEPARTMENTS & COLLABORATORS
create policy "Users can view department/collaborator links for tickets they can access." on internal_ticket_departments for
select using (
    internal_ticket_id in (
      select id from internal_tickets
    )
  );
create policy "Users can view department/collaborator links for tickets they can access." on internal_ticket_collaborators for
select using (
    internal_ticket_id in (
      select id from internal_tickets
    )
  );
create policy "Users can add departments/collaborators when creating a ticket." on internal_ticket_departments for
insert with check (true);
create policy "Users can add departments/collaborators when creating a ticket." on internal_ticket_collaborators for
insert with check (true);

-- TICKET COMMENTS
create policy "Users can view comments for tickets they can access." on ticket_comments for
select using (
    internal_ticket_id in (
      select id from internal_tickets
    )
  );
create policy "Users can post comments on tickets they can access." on ticket_comments for
insert with check (
    internal_ticket_id in (
      select id from internal_tickets
    )
  );

-- NOTIFICATIONS
create policy "Users can view their own notifications." on notifications for
select using (auth.uid() = user_id);
create policy "Users can update their own notifications." on notifications for
update using (auth.uid() = user_id);

-- Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible." on storage.objects for
select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects for
insert with check (bucket_id = 'avatars');

create policy "Anyone can update their own avatar." on storage.objects for
update with check (
    bucket_id = 'avatars'
    and auth.uid() = owner
  );

-- Ticket Attachments
insert into storage.buckets (id, name, public)
values ('ticket_attachments', 'ticket_attachments', true);

create policy "Ticket attachments are viewable by users who can see the ticket." on storage.objects for
select using (
    bucket_id = 'ticket_attachments'
    and (
      select internal_ticket_id
      from ticket_comments
      where attachment_url = storage.objects.name
    ) in (
      select id
      from internal_tickets
    )
  );

create policy "Authenticated users can upload attachments." on storage.objects for
insert with check (
    bucket_id = 'ticket_attachments'
    and auth.role() = 'authenticated'
  );

-- KNOWLEDGE BASE
create policy "Docs are public" on knowledge_base_documents for
select using (true);
create policy "Admins can manage docs" on knowledge_base_documents for all using (
  (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin', 'admin', 'ceo')
);

create policy "Chunks are public" on document_chunks for
select using (true);

-- PREFILLED QUESTIONS
create policy "Prefilled questions are viewable by everyone." on prefilled_questions for
select using (true);
create policy "Admins can manage prefilled questions." on prefilled_questions for all using (
  (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin', 'admin', 'ceo')
);

-- CHATS & MESSAGES
create policy "Agents and admins can manage chats." on chats for all using (
  (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin', 'admin', 'agent', 'department_head', 'ceo')
);
create policy "Agents and admins can manage chat messages." on chat_messages for all using (
  (
    select role
    from profiles
    where id = auth.uid()
  ) in ('system_admin', 'super_admin', 'admin', 'agent', 'department_head', 'ceo')
);


-- Set up the trigger function for handling new user profiles
create or replace function public.handle_new_user() returns trigger as $$
declare
    unique_username text;
    base_username text;
    attempts integer := 0;
begin
    -- Generate a base username from the email
    base_username := split_part(new.email, '@', 1);
    
    -- Ensure username is at least 3 characters
    if length(base_username) < 3 then
        base_username := base_username || substr(md5(random()::text), 0, 4);
    end if;

    unique_username := base_username;

    -- Loop to find a unique username
    while exists (select 1 from public.profiles where username = unique_username) loop
        attempts := attempts + 1;
        unique_username := base_username || '_' || attempts;
        if attempts > 5 then
            -- Failsafe to prevent infinite loops
            unique_username := base_username || '_' || substr(md5(random()::text), 0, 7);
            if exists (select 1 from public.profiles where username = unique_username) then
              -- Extremely unlikely case, just use a random UUID
              unique_username := 'user_' || gen_random_uuid()::text;
            end if;
            break;
        end if;
    end loop;

    insert into public.profiles (id, full_name, username, email, avatar_url)
    values (
        new.id,
        new.raw_user_meta_data ->> 'full_name',
        unique_username,
        new.email,
        new.raw_user_meta_data ->> 'avatar_url'
    );
    return new;
end;
$$ language plpgsql security definer;
-- create the trigger
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();


-- Function to automatically assign ticket to department head with least work
CREATE OR REPLACE FUNCTION get_least_busy_department_head(dept_id uuid)
RETURNS uuid AS $$
DECLARE
    head_id uuid;
BEGIN
    SELECT p.id INTO head_id
    FROM profiles p
    LEFT JOIN internal_tickets t ON p.id = t.assigned_to AND t.status NOT IN ('closed', 'resolved')
    WHERE p.department_id = dept_id AND p.role = 'department_head'
    GROUP BY p.id
    ORDER BY COUNT(t.id) ASC
    LIMIT 1;

    RETURN head_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications
create or replace function on_ticket_assignment()
returns trigger as $$
declare
  ticket_title text;
  creator_name text;
begin
  if new.assigned_to is not null and new.assigned_to != new.created_by then
    select title into ticket_title from internal_tickets where id = new.id;
    select full_name into creator_name from profiles where id = new.created_by;

    insert into notifications (user_id, ticket_id, message, notification_type, actor_id)
    values (
      new.assigned_to,
      new.id,
      '<b>' || coalesce(creator_name, 'A user') || '</b> assigned a new ticket to you: <b>' || ticket_title || '</b>',
      'assignment',
      new.created_by
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger ticket_assigned_trigger
after insert on internal_tickets
for each row
execute procedure on_ticket_assignment();

create or replace function on_ticket_collaborator_added()
returns trigger as $$
declare
  ticket_title text;
  adder_name text;
  ticket_creator_id uuid;
begin
  select created_by, title into ticket_creator_id, ticket_title from internal_tickets where id = new.internal_ticket_id;
  select full_name into adder_name from profiles where id = ticket_creator_id;

  if new.user_id != ticket_creator_id then
    insert into notifications (user_id, ticket_id, message, notification_type, actor_id)
    values (
      new.user_id,
      new.internal_ticket_id,
      '<b>' || coalesce(adder_name, 'A user') || '</b> added you as a collaborator on ticket: <b>' || ticket_title || '</b>',
      'collaboration',
      ticket_creator_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger collaborator_added_trigger
after insert on internal_ticket_collaborators
for each row
execute procedure on_ticket_collaborator_added();


-- Seed data
-- Seed departments
INSERT INTO departments (id, name) VALUES
('b3a0f7e4-2f1a-4a9b-9c1c-5b6b1a2a3e4d', 'IT Support'),
('a1b2c3d4-5e6f-7a8b-9c1d-2e3f4a5b6c7d', 'Customer Support'),
('f1e2d3c4-b5a6-9878-7a6b-5c4d3e2f1a0b', 'Finance'),
('c1b2a3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6', 'HR'),
('d4e5f6a7-b8c9-d0e1-f2a3b4c5d6e7', 'BackOffice'),
('a7b8c9d0-e1f2-a3b4-c5d6-e7f8a9b0c1d2', 'Risk Management'),
('b8c9d0e1-f2a3-b4c5-d6e7-f8a9b0c1d2e3', 'Compliance'),
('c9d0e1f2-a3b4-c5d6-e7f8-a9b0c1d2e3f4', 'Trading'),
('d0e1f2a3-b4c5-d6e7-f8a9-b0c1d2e3f4g5', 'Account Management')
ON CONFLICT (id) DO NOTHING;

-- Seed task board columns
create or replace function seed_task_columns()
returns void as $$
begin
    if not exists (select 1 from task_columns) then
        insert into task_columns (title, position) values
        ('Backlog', 0),
        ('To Do', 1),
        ('In Progress', 2),
        ('Complete', 3);
    end if;
end;
$$ language plpgsql;

select seed_task_columns();

-- Function to update chat's updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats
    SET updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat on new message
CREATE TRIGGER on_new_chat_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();

-- Function to handle chat escalation
CREATE OR REPLACE FUNCTION escalate_chat_to_agent(p_chat_id uuid, p_client_name text, p_client_email text)
RETURNS int AS $$
DECLARE
    queue_position int;
BEGIN
    -- Update the chat status to 'escalated'
    UPDATE chats
    SET status = 'escalated',
        client_name = p_client_name,
        client_email = p_client_email,
        updated_at = NOW()
    WHERE id = p_chat_id;

    -- Calculate the queue position
    SELECT COUNT(*) + 1 INTO queue_position
    FROM chats
    WHERE status = 'escalated' AND assigned_agent_id IS NULL AND created_at < (SELECT created_at FROM chats WHERE id = p_chat_id);
    
    -- Create a notification for all agents
    INSERT INTO notifications (user_id, message, notification_type, ticket_id)
    SELECT id, 'A new live chat is waiting in the queue.', 'live_chat', p_chat_id
    FROM profiles
    WHERE role IN ('agent', 'department_head', 'admin', 'system_admin', 'super_admin');
    
    RETURN queue_position;
END;
$$ LANGUAGE plpgsql;


-- Function and trigger to embed documents automatically
create or replace function trigger_embed_document()
returns trigger as $$
begin
    perform net.http_post(
        url := supabase_url() || '/functions/v1/embed-document',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || supabase_service_role_key() -- Use a secure way to get this key
        ),
        body := jsonb_build_object(
            'documentId', new.id,
            'content', new.content
        )
    );
    return new;
end;
$$ language plpgsql;

create trigger on_document_inserted
after insert on knowledge_base_documents
for each row execute procedure trigger_embed_document();


-- Function to get ticket counts for CRM desk
CREATE OR REPLACE FUNCTION get_crm_ticket_counts()
RETURNS TABLE(all_count bigint, opened_count bigint, opened_today_count bigint, waiting_for_response_count bigint, closed_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM crm_tickets),
        (SELECT COUNT(*) FROM crm_tickets WHERE status IN ('open', 'in_progress', 'pending support', 'pending client')),
        (SELECT COUNT(*) FROM crm_tickets WHERE created_at >= date_trunc('day', now()) AND status IN ('open', 'in_progress', 'pending support', 'pending client')),
        (SELECT COUNT(*) FROM crm_tickets WHERE status = 'pending support'),
        (SELECT COUNT(*) FROM crm_tickets WHERE status IN ('closed', 'resolved'));
END;
$$ LANGUAGE plpgsql;

-- Function to get agent performance stats
CREATE OR REPLACE FUNCTION get_agent_performance_stats()
RETURNS TABLE(
    agent_id uuid,
    agent_name text,
    agent_avatar_url text,
    total_resolved bigint,
    avg_resolution_time_minutes numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS agent_id,
        p.full_name AS agent_name,
        p.avatar_url AS agent_avatar_url,
        COUNT(t.id) FILTER (WHERE t.status = 'resolved') AS total_resolved,
        COALESCE(
            AVG(
                CASE
                    WHEN t.status = 'resolved'
                    THEN EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 60
                    ELSE NULL
                END
            ), 0
        )::numeric(10, 2) AS avg_resolution_time_minutes
    FROM
        profiles p
    JOIN
        internal_tickets t ON p.id = t.assigned_to
    WHERE
        p.role IN ('agent', 'department_head', 'admin')
    GROUP BY
        p.id, p.full_name, p.avatar_url;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent SLA success rate
CREATE OR REPLACE FUNCTION get_agent_sla_success_rate()
RETURNS TABLE(
    agent_id uuid,
    sla_success_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH resolved_tickets AS (
        SELECT
            t.id,
            t.assigned_to,
            t.updated_at, -- Assuming this is resolution time
            sp.resolution_time_minutes,
            (t.updated_at <= (t.created_at + (sp.resolution_time_minutes * INTERVAL '1 minute'))) AS met_sla
        FROM
            internal_tickets t
        JOIN
            sla_policies sp ON t.sla_policy_id = sp.id
        WHERE
            t.status = 'resolved' AND t.assigned_to IS NOT NULL
    )
    SELECT
        p.id AS agent_id,
        COALESCE(
            (COUNT(rt.id) FILTER (WHERE rt.met_sla = true) * 100.0 / COUNT(rt.id)),
            100.0
        )::numeric(5, 2) AS sla_success_rate
    FROM
        profiles p
    LEFT JOIN
        resolved_tickets rt ON p.id = rt.assigned_to
    WHERE
        p.role IN ('agent', 'department_head', 'admin')
    GROUP BY
        p.id;
END;
$$ LANGUAGE plpgsql;

-- Seed Permissions for roles
-- This seeds the initial permission set. Changes can be made in the UI.
insert into role_permissions (role, permission) values
  -- System Admin (Has implicit access to everything, but we can be explicit)
  ('system_admin', 'view_analytics'),
  ('system_admin', 'access_knowledge_base'),
  ('system_admin', 'create_tickets'),
  ('system_admin', 'view_all_tickets_in_department'),
  ('system_admin', 'change_ticket_status'),
  ('system_admin', 'delete_tickets'),
  ('system_admin', 'edit_ticket_properties'),
  ('system_admin', 'assign_tickets'),
  ('system_admin', 'manage_all_users'),
  ('system_admin', 'manage_users_in_department'),
  ('system_admin', 'access_admin_panel'),
  ('system_admin', 'manage_departments'),
  ('system_admin', 'manage_templates'),
  ('system_admin', 'manage_knowledge_base'),
  ('system_admin', 'manage_sla_policies'),
  ('system_admin', 'manage_chat_settings'),
  ('system_admin', 'manage_roles'),
  ('system_admin', 'access_crm_tickets'),
  ('system_admin', 'access_live_chat'),
  ('system_admin', 'view_task_board'),
  ('system_admin', 'delete_users'),
  
  -- CEO (Similar to System Admin, but might be restricted in the future)
  ('ceo', 'view_analytics'),
  ('ceo', 'access_knowledge_base'),
  ('ceo', 'create_tickets'),
  ('ceo', 'view_all_tickets_in_department'),
  ('ceo', 'change_ticket_status'),
  ('ceo', 'delete_tickets'),
  ('ceo', 'edit_ticket_properties'),
  ('ceo', 'assign_tickets'),
  ('ceo', 'manage_all_users'),
  ('ceo', 'manage_users_in_department'),
  ('ceo', 'access_admin_panel'),
  ('ceo', 'manage_departments'),
  ('ceo', 'manage_templates'),
  ('ceo', 'manage_knowledge_base'),
  ('ceo', 'manage_sla_policies'),
  ('ceo', 'manage_chat_settings'),
  ('ceo', 'manage_roles'),
  ('ceo', 'access_crm_tickets'),
  ('ceo', 'access_live_chat'),
  ('ceo', 'view_task_board'),
  ('ceo', 'delete_users'),

  -- Department Head
  ('department_head', 'view_analytics'),
  ('department_head', 'access_knowledge_base'),
  ('department_head', 'create_tickets'),
  ('department_head', 'view_all_tickets_in_department'),
  ('department_head', 'change_ticket_status'),
  ('department_head', 'edit_ticket_properties'),
  ('department_head', 'assign_tickets'),
  ('department_head', 'manage_users_in_department'),
  ('department_head', 'access_crm_tickets'),
  ('department_head', 'access_live_chat'),
  ('department_head', 'view_task_board'),
  
  -- Agent
  ('agent', 'access_knowledge_base'),
  ('agent', 'create_tickets'),
  ('agent', 'access_crm_tickets'),
  ('agent', 'access_live_chat'),
  ('agent', 'view_task_board'),
  
  -- User
  ('user', 'create_tickets')
  on conflict do nothing;

