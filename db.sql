-- Create user_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('system_admin', 'manager', 'agent', 'user');
    END IF;
END
$$;

-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  updated_at timestamp with time zone,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  website text,
  role user_role DEFAULT 'user',
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text NOT NULL DEFAULT 'low'::text,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  assigned_to uuid REFERENCES public.profiles (id),
  department_id uuid NOT NULL REFERENCES public.departments (id),
  is_external boolean NOT NULL DEFAULT false,
  attachment_url text,
  category text,
  tags text[],
  collaborators uuid[]
);

-- Create ticket_collaborators join table
CREATE TABLE IF NOT EXISTS public.ticket_collaborators (
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, user_id)
);


-- Create ticket_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ticket_templates (
  id serial PRIMARY KEY,
  title text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id),
  priority text NOT NULL DEFAULT 'medium'::text,
  category text
);


-- Set up Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_collaborators ENABLE ROW LEVEL SECURITY;


-- Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE id = user_id;
  RETURN user_role_name;
END;
$$;


-- Set up the trigger to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RLS POLICIES
-- Drop existing policies to avoid errors on re-run
DROP POLICY IF EXISTS "Departments are viewable by authenticated users." ON public.departments;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can create tickets." ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets based on their role and collaboration status." ON public.tickets;
DROP POLICY IF EXISTS "Users can update their own tickets." ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can manage collaborators on tickets they can see." ON public.ticket_collaborators;


-- departments policies
CREATE POLICY "Departments are viewable by authenticated users." ON public.departments FOR SELECT TO authenticated USING (true);

-- profiles policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- tickets policies
CREATE POLICY "Users can create tickets." ON public.tickets FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view tickets based on their role and collaboration status." ON public.tickets FOR SELECT TO authenticated USING (
  auth.uid() = created_by OR
  (get_user_role(auth.uid()) IN ('system_admin', 'manager')) OR
  id IN (SELECT ticket_id FROM public.ticket_collaborators WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update their own tickets." ON public.tickets FOR UPDATE USING (auth.uid() = created_by);

-- ticket_collaborators policies
CREATE POLICY "Users can manage collaborators on tickets they can see." ON public.ticket_collaborators
FOR ALL TO authenticated
USING (
    ticket_id IN (SELECT id FROM public.tickets) -- This re-checks the SELECT policy on tickets
)
WITH CHECK (
    ticket_id IN (SELECT id FROM public.tickets)
);


-- ticket_templates policies
CREATE POLICY "Authenticated users can view templates" ON public.ticket_templates FOR SELECT TO authenticated USING (true);


-- STORAGE POLICIES
-- Drop existing policies to avoid errors
DROP POLICY IF EXISTS "Allow authenticated users to upload to ticket_attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to view their own files in ticket_attachments" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;

-- ticket_attachments bucket
CREATE POLICY "Allow authenticated users to upload to ticket_attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'ticket_attachments' );
CREATE POLICY "Allow owner to view their own files in ticket_attachments" ON storage.objects FOR SELECT TO authenticated USING ( bucket_id = 'ticket_attachments' AND owner = auth.uid() );

-- avatars bucket
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE USING ( auth.uid() = owner );


-- SEED DATA
-- Insert departments, do nothing if they already exist
INSERT INTO public.departments (name) VALUES
('IT Support'),
('Trading'),
('Finance'),
('Compliance'),
('Customer Support'),
('Administration'),
('Operation'),
('Marketing'),
('HR')
ON CONFLICT (name) DO NOTHING;
