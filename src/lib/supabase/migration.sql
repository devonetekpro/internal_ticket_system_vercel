/*
================================================================================
-- HelpFlow Database Migration Script --
================================================================================
This script contains all the necessary SQL statements to set up the HelpFlow 
database schema, including tables, functions, and triggers.

Run this entire script in your Supabase SQL Editor to initialize your database.
================================================================================
*/


/* 
================================================================================
-- Section 5.1: CRM & External Ticket Linking --
================================================================================
*/

/* 
  1. ADD CRM MANAGER ID TO PROFILES
  This adds a column to store the integer ID from the external CRM system,
  allowing us to link a HelpFlow user to their CRM manager profile.
*/
ALTER TABLE public.profiles
ADD COLUMN crm_manager_id INTEGER;

/*
  2. ADD is_external TO internal_tickets
  This boolean column marks a ticket as originating from the external CRM.
*/
ALTER TABLE public.internal_tickets
ADD COLUMN is_external BOOLEAN NOT NULL DEFAULT false;

/*
  3. ADD job_title to profiles
  This adds a column to store the user's job title from OAuth provider.
*/
ALTER TABLE public.profiles
ADD COLUMN job_title TEXT;


-- Function to get counts for CRM tickets tabs
CREATE OR REPLACE FUNCTION get_crm_ticket_counts()
RETURNS TABLE(opened_count bigint, opened_today_count bigint, waiting_for_response_count bigint, closed_count bigint, all_count bigint)
LANGUAGE sql
AS $$
    SELECT
        (SELECT COUNT(*) FROM crm_tickets WHERE status IN ('open', 'in_progress', 'pending support', 'pending client')) AS opened_count,
        (SELECT COUNT(*) FROM crm_tickets WHERE created_at >= date_trunc('day', now()) AND status IN ('open', 'in_progress', 'pending support', 'pending client')) AS opened_today_count,
        (SELECT COUNT(*) FROM crm_tickets WHERE status = 'pending support') AS waiting_for_response_count,
        (SELECT COUNT(*) FROM crm_tickets WHERE status IN ('closed', 'resolved')) AS closed_count,
        (SELECT COUNT(*) FROM crm_tickets) AS all_count;
$$;


/* 
================================================================================
-- Section 5.2: Kanban Board Setup --
================================================================================
*/

-- 1. Create the table for columns (e.g., Backlog, TODO)
CREATE TABLE IF NOT EXISTS public.task_columns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create the table for individual tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id uuid REFERENCES public.task_columns(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  "position" INTEGER NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  internal_ticket_id uuid REFERENCES public.internal_tickets(id) ON DELETE SET NULL
);

-- 3. Create and run a function to seed the initial columns
CREATE OR REPLACE FUNCTION seed_task_columns()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_columns) THEN
    INSERT INTO public.task_columns (title, "position") VALUES
    ('Backlog', 0),
    ('TODO', 1),
    ('In Progress', 2),
    ('Complete', 3);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Run the function once to create the columns
SELECT seed_task_columns();


/* 
================================================================================
-- Section 5.3: Live Chat & Knowledge Base Setup --
================================================================================
*/

-- 1. Enable the pgvector and pg_net extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the table for knowledge base documents (metadata)
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL, -- Store the full original text content
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.knowledge_base_documents DROP COLUMN IF EXISTS embedding;

-- 2.1 Create the table for document chunks (for RAG)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.knowledge_base_documents(id) on delete cascade,
  content text,
  embedding vector(768),
  created_at timestamp with time zone default now() not null
);

-- 2.2 Create an index for faster similarity search
CREATE INDEX IF NOT EXISTS on document_chunks USING ivfflat (embedding vector_cosine_ops);


-- 3. Create the table for chat sessions
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL, -- Could be a session ID or user ID for logged-in users
  client_name TEXT, -- Add client_name column
  client_email TEXT, -- Add client_email column
  status TEXT NOT NULL DEFAULT 'active', -- e.g., 'active', 'resolved', 'escalated'
  assigned_agent_id uuid REFERENCES public.profiles(id),
  linked_ticket_id uuid REFERENCES public.internal_tickets(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Create the table for chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL, -- 'client', 'ai', or 'agent'
  content TEXT NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Add a trigger to update the `updated_at` timestamp on the chat
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

-- 6. Add the vector search function for document chunks
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_count int,
  min_similarity float
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > min_similarity
  ORDER BY similarity DESC
  LIMIT match_count;
$$;


-- 7. Add function to get queue position
CREATE OR REPLACE FUNCTION escalate_chat_to_agent(
    p_chat_id uuid,
    p_client_name text,
    p_client_email text
)
RETURNS integer AS $$
DECLARE
  queue_position integer;
BEGIN
  -- Update the chat status and client info
  UPDATE public.chats
  SET 
    status = 'active', -- 'active' now means waiting for an agent
    client_name = p_client_name,
    client_email = p_client_email
  WHERE id = p_chat_id;

  -- Calculate the queue position
  SELECT count(*)
  INTO queue_position
  FROM public.chats
  WHERE
    status = 'active'
    AND assigned_agent_id IS NULL
    AND created_at <= (SELECT created_at FROM public.chats WHERE id = p_chat_id);

  RETURN queue_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Add background processing trigger for knowledge base documents
CREATE OR REPLACE FUNCTION process_new_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    webhook_url text;
BEGIN
    -- IMPORTANT: Replace with your actual Edge Function URL and Service Role Key
    webhook_url := 'https://<your-project-ref>.supabase.co/functions/v1/embed-document';

    -- Use pg_net to call the Edge Function asynchronously
    -- Ensure you have enabled the pg_net extension in your database
    PERFORM net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || '<your-service-role-key>'
        ),
        body := jsonb_build_object('documentId', NEW.id, 'content', NEW.content)
    );
    RETURN NEW;
END;
$$;

-- Create the trigger that fires after a new document is inserted
CREATE OR REPLACE TRIGGER on_document_insert
AFTER INSERT ON public.knowledge_base_documents
FOR EACH ROW
EXECUTE FUNCTION process_new_document();


/* 
================================================================================
-- Section 5.4: Prefilled Questions Setup --
================================================================================
*/

-- Create the table for prefilled chat questions
CREATE TABLE IF NOT EXISTS public.prefilled_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id)
);


/* 
================================================================================
-- Section 5.5: Department Seeding --
================================================================================
*/

CREATE OR REPLACE FUNCTION seed_departments()
RETURNS void AS $$
DECLARE
  depts TEXT[] := ARRAY[
    'Finance', 'Business Development', 'BackOffice', 'Marketing', 
    'Administration', 'Compliance', 'Human Resources', 
    'Information Technology', 'Operation', 'Dealing', 'Sales'
  ];
  dept_name TEXT;
BEGIN
  FOREACH dept_name IN ARRAY depts
  LOOP
    INSERT INTO public.departments (name)
    VALUES (dept_name)
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function once to create the departments
SELECT seed_departments();


/* 
================================================================================
-- Section 5.6: Database Triggers & Functions --
================================================================================
*/

/* 
  1. REMOVE OLD NEW USER PROFILE TRIGGER
  This function is no longer needed as the profile creation is now handled
  by a server-side function in the Next.js auth callback.
*/
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();


/* 
  2. TICKET ASSIGNMENT TRIGGER
  Notifies a user when a ticket is assigned to them.
*/
CREATE OR REPLACE FUNCTION public.handle_ticket_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  notification_message TEXT;
BEGIN
  -- Check if it's an INSERT or if the 'assigned_to' field has been changed on UPDATE
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

    -- Get the name of the user who triggered the action (the creator or updater)
    SELECT p.full_name INTO creator_name
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    -- If the creator's name is not found, use a default
    IF creator_name IS NULL THEN
      creator_name := 'The system';
    END IF;

    -- Create the notification message
    notification_message := 'assigned you a new ticket: <b>' || NEW.title || '</b>';

    -- Insert the new notification
    INSERT INTO public.notifications (user_id, ticket_id, message, notification_type, actor_id)
    VALUES (NEW.assigned_to, NEW.id, notification_message, 'assignment', auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure it's not duplicated
DROP TRIGGER IF EXISTS on_ticket_assignment ON public.internal_tickets;
-- Create the trigger that executes the function
CREATE TRIGGER on_ticket_assignment
  AFTER INSERT OR UPDATE ON public.internal_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_assignment_notification();


/*
  3. COLLABORATOR ADDITION TRIGGER
  Notifies a user when they are added as a collaborator to a ticket.
*/
CREATE OR REPLACE FUNCTION public.handle_collaborator_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
  ticket_title TEXT;
  notification_message TEXT;
BEGIN
  -- Find the name of the user performing the action (the one adding the collaborator)
  SELECT p.full_name INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  IF actor_name IS NULL THEN
    actor_name := 'A user';
  END IF;

  -- Get the title of the ticket
  SELECT t.title INTO ticket_title
  FROM public.internal_tickets t
  WHERE t.id = NEW.internal_ticket_id;

  -- Create the notification message
  notification_message := 'added you as a collaborator on ticket: <b>' || ticket_title || '</b>';

  -- Insert the notification for the new collaborator
  INSERT INTO public.notifications (user_id, ticket_id, message, notification_type, actor_id)
  VALUES (NEW.user_id, NEW.internal_ticket_id, notification_message, 'collaboration', auth.uid());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure it's not duplicated
DROP TRIGGER IF EXISTS on_new_collaborator ON public.internal_ticket_collaborators;
-- Create the trigger that executes the function
CREATE TRIGGER on_new_collaborator
  AFTER INSERT ON public.internal_ticket_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_collaborator_notification();


/*
  4. TICKET STATUS CHANGE TRIGGER (FOR CREATOR)
  Notifies the original ticket creator when their ticket is resolved or closed.
*/
CREATE OR REPLACE FUNCTION public.handle_ticket_status_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
  notification_message TEXT;
BEGIN
  -- Proceed only if the status has changed to 'resolved' or 'closed'
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND (NEW.status = 'resolved' OR NEW.status = 'closed') THEN

    -- Get the name of the user who made the change
    SELECT p.full_name INTO actor_name
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    IF actor_name IS NULL THEN
      actor_name := 'The system';
    END IF;

    -- Do not send a notification if the creator is the one closing their own ticket
    IF NEW.created_by = auth.uid() THEN
      RETURN NEW;
    END IF;
    
    -- Create the notification message
    notification_message := '<b>' || actor_name || '</b> marked your ticket as ' || NEW.status || ': <b>' || NEW.title || '</b>';

    -- Insert the notification for the ticket creator
    INSERT INTO public.notifications (user_id, ticket_id, message, notification_type, actor_id)
    VALUES (NEW.created_by, NEW.id, notification_message, 'status_change', auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure it's not duplicated
DROP TRIGGER IF EXISTS on_ticket_status_change ON public.internal_tickets;
-- Create the trigger that executes the function
CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE ON public.internal_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_status_change_notification();


-- Drop the function if it exists to ensure a clean update
DROP FUNCTION IF EXISTS get_agent_performance_stats();

-- 1. Main function to get agent performance stats
CREATE OR REPLACE FUNCTION get_agent_performance_stats()
RETURNS TABLE (
    agent_id uuid,
    agent_name text,
    agent_avatar_url text,
    total_resolved bigint,
    avg_resolution_time_minutes double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS agent_id,
        p.full_name AS agent_name,
        p.avatar_url AS agent_avatar_url,
        COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) AS total_resolved,
        COALESCE(
            AVG(
                EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 60
            ) FILTER (WHERE t.status IN ('resolved', 'closed')),
            0
        )::double precision AS avg_resolution_time_minutes
    FROM
        public.profiles p
    LEFT JOIN
        public.internal_tickets t ON p.id = t.assigned_to
    WHERE
        p.role IN ('agent', 'manager', 'department_head', 'admin', 'system_admin', 'super_admin', 'ceo')
    GROUP BY
        p.id, p.full_name, p.avatar_url
    ORDER BY
        total_resolved DESC;
END;
$$;

-- Drop the function if it exists to ensure a clean update
DROP FUNCTION IF EXISTS get_agent_sla_success_rate();

-- 2. Function to calculate SLA success rate per agent
CREATE OR REPLACE FUNCTION get_agent_sla_success_rate()
RETURNS TABLE(agent_id uuid, sla_success_rate numeric)
LANGUAGE sql
AS $$
    WITH ticket_sla_status AS (
        SELECT
            t.assigned_to,
            CASE
                WHEN t.status IN ('resolved', 'closed') AND t.updated_at <= (t.created_at + (sp.resolution_time_minutes * INTERVAL '1 minute')) THEN 1
                WHEN t.status IN ('resolved', 'closed') THEN 0
                ELSE NULL
            END AS sla_met
        FROM internal_tickets t
        JOIN sla_policies sp ON t.sla_policy_id = sp.id
        WHERE t.assigned_to IS NOT NULL AND t.sla_policy_id IS NOT NULL
    )
    SELECT
        s.assigned_to as agent_id,
        (SUM(s.sla_met)::decimal / COUNT(s.sla_met)) * 100 AS sla_success_rate
    FROM ticket_sla_status s
    WHERE s.sla_met IS NOT NULL
    GROUP BY s.assigned_to;
$$;
