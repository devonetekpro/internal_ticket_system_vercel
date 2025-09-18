-- This is a one-time migration script to safely remove the 'manager' role.
-- Run this script in your Supabase SQL Editor to update your existing database.

DO $$
DECLARE 
    -- No variables needed for this specific operation
BEGIN
    -- Step 1: Reassign any users with the 'manager' role to 'department_head'
    UPDATE public.profiles
    SET role = 'department_head'
    WHERE role = 'manager';

    -- Step 2: Drop the default on the 'role' column before changing the type
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

    -- Step 3: Rename the existing user_role enum to a temporary name
    ALTER TYPE public.user_role RENAME TO user_role_old;

    -- Step 4: Create the new user_role enum without 'manager'
    CREATE TYPE public.user_role AS ENUM (
        'system_admin',
        'super_admin',
        'admin',
        'ceo',
        'department_head',
        'agent',
        'user'
    );

    -- Step 5: Update the table to use the new enum.
    -- This includes casting the old values to text and then to the new enum type.
    ALTER TABLE public.profiles ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
    ALTER TABLE public.role_permissions ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;

    -- Step 6: Restore the default value on the 'role' column
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

    -- Step 7: Drop the old, now unused, enum type
    DROP TYPE public.user_role_old;

    RAISE NOTICE 'Successfully migrated user_role enum and removed "manager" role.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'An error occurred during user_role migration: %', SQLERRM;
END;
$$;
