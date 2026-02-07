-- Fix search_path for generate_liberation_code function
CREATE OR REPLACE FUNCTION public.generate_liberation_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- Fix search_path for set_liberation_code function
CREATE OR REPLACE FUNCTION public.set_liberation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_liberacao IS NULL THEN
    NEW.codigo_liberacao := public.generate_liberation_code();
  END IF;
  RETURN NEW;
END;
$$;