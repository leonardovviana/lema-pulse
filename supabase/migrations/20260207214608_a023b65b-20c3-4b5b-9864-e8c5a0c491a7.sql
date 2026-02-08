-- Add liberation code to surveys for interviewers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pesquisas' AND column_name = 'codigo_liberacao'
  ) THEN
    ALTER TABLE public.pesquisas ADD COLUMN codigo_liberacao TEXT UNIQUE;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pesquisas_codigo_liberacao ON public.pesquisas(codigo_liberacao);

-- Function to generate random 6-character code
CREATE OR REPLACE FUNCTION public.generate_liberation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate code on insert
CREATE OR REPLACE FUNCTION public.set_liberation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo_liberacao IS NULL THEN
    NEW.codigo_liberacao := public.generate_liberation_code();
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trigger_set_liberation_code ON public.pesquisas;
END $$;

CREATE TRIGGER trigger_set_liberation_code
BEFORE INSERT ON public.pesquisas
FOR EACH ROW
EXECUTE FUNCTION public.set_liberation_code();