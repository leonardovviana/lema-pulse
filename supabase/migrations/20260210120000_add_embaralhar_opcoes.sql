-- Add shuffle options flag to surveys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pesquisas' AND column_name = 'embaralhar_opcoes'
  ) THEN
    ALTER TABLE public.pesquisas ADD COLUMN embaralhar_opcoes BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
