-- Allow admin checks via profiles.is_admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR (
    _role = 'admin' AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = _user_id
        AND is_admin = true
    )
  )
$$;

-- Ensure respostas can join profiles by user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'respostas_entrevistador_profile_fkey'
  ) THEN
    ALTER TABLE public.respostas
      ADD CONSTRAINT respostas_entrevistador_profile_fkey
      FOREIGN KEY (entrevistador_id)
      REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;
