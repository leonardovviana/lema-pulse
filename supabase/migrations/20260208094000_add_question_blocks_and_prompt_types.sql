-- Add blocks for survey sections
CREATE TABLE IF NOT EXISTS public.blocos_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID REFERENCES public.pesquisas(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add prompt metadata to perguntas
ALTER TABLE public.perguntas ADD COLUMN IF NOT EXISTS bloco_id UUID REFERENCES public.blocos_perguntas(id) ON DELETE SET NULL;
ALTER TABLE public.perguntas ADD COLUMN IF NOT EXISTS tipo_pergunta TEXT NOT NULL DEFAULT 'estimulada';
ALTER TABLE public.perguntas ADD COLUMN IF NOT EXISTS opcoes_sugeridas TEXT[];
ALTER TABLE public.perguntas ADD COLUMN IF NOT EXISTS permite_outro BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'perguntas_tipo_pergunta_check'
  ) THEN
    ALTER TABLE public.perguntas
      ADD CONSTRAINT perguntas_tipo_pergunta_check
      CHECK (tipo_pergunta IN ('espontanea', 'estimulada', 'mista'));
  END IF;
END $$;

-- RLS for blocos_perguntas
ALTER TABLE public.blocos_perguntas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view blocks of active surveys" ON public.blocos_perguntas;
  DROP POLICY IF EXISTS "Admins can manage blocks" ON public.blocos_perguntas;
END $$;

CREATE POLICY "Anyone can view blocks of active surveys"
ON public.blocos_perguntas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pesquisas
    WHERE pesquisas.id = blocos_perguntas.pesquisa_id
      AND (pesquisas.ativa = true OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Admins can manage blocks"
ON public.blocos_perguntas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
