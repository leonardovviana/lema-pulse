DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'codigo_acesso'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN codigo_acesso TEXT;
  END IF;
END $$;
