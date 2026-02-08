-- Add is_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- Optional: Migrate existing data from user_roles if needed
-- This ensures existing admins maintain their status
UPDATE public.profiles
SET is_admin = true
WHERE user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
);
