-- Add equipe (team) column to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'equipe'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN equipe TEXT;
  END IF;
END $$;

-- Create index for team filtering
CREATE INDEX IF NOT EXISTS idx_profiles_equipe ON public.profiles(equipe);
